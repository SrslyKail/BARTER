const cloudinary = require("cloudinary").v2;
const {
  getUsername,
  formatProfileIconPath,
  updateSession,
  getUserId,
  userCard,
} = require("./modules/localSession");

const { getPlaceName } = require("./modules/location");
const { databases, ObjectId } = require("./modules/databaseConnection");
const { userCollection, userSkillsCollection, ratingsCollection } = databases;
const { usernameSchema } = require("./modules/validationSchemas");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true,
});

/**
 * Handles processing the income changes from editProfile.
 * Checks if the user submitted a profile image and processes it to cloudinary if they did.
 * @param {Request} req
 * @param {Response} res
 */
async function updateProfile(req, res) {
  //Shinanigans required to get the body and be able to edit it.
  let data = JSON.stringify(req.body);
  data = JSON.parse(data);
  data = removeEmptyAttributes(data);
  data = await handleGeoUpdates(data);
  if (req.file) {
    await cloudinary.uploader
      .upload(req.file.path)
      .then((result) => {
        let scheme = "/upload/";
        let img = result.url.split(scheme)[1];
        data["userIcon"] = img;
        req.session.user.userIcon = formatProfileIconPath(img);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Error",
        });
      });
  }
  //If the user submitted no valid data, we dont upload anything to Mongo
  let dataKeys = Object.keys(data);
  if (dataKeys.length > 0) {
    await updateUserInformation(req, data);
  }
  res.redirect("/profile");
}

async function handleGeoUpdates(data) {
  let dataKeys = Object.keys(data);
  if (dataKeys.includes("longitude")) {
    data["userLocation"] = {
      geo: {
        longitude: Number(data["longitude"]),
        latitude: Number(data["latitude"]),
      },
    };
    let placeName = await getPlaceName(
      Number(data["longitude"]),
      Number(data["latitude"])
    );
    data["userLocation"]["placeName"] = placeName;

    delete data["longitude"];
    delete data["latitude"];
  }
  return data;
}

async function updateUserInformation(req, data) {
  await updateMongoUser(req, data);
  updateSession(req, data);
}

function removeEmptyAttributes(data) {
  Object.keys(data).forEach((att) => {
    if (!data[att]) {
      delete data[att];
    }
  });
  return data;
}

async function loadProfile(req, res) {
  let currentUsername = getUsername(req);
  let currentUserId = getUserId(req);
  let quieriedUserSkills = [];
  let queryUsername = req.query.id;
  let referrer = req.get("referrer");

  //If the user is not logged in
  if (!currentUserId) {
    res.redirect("/login");
    return;
  } else if (req.session.user && queryUsername == undefined) {
    //If the user is trying to access the default /profile, redirect to their own profile
    res.redirect(`/profile?id=${currentUsername}`);
    return;
  }

  if (referrer == undefined) {
    referrer = "/";
  }

  //validate the queryID is not some sort of an attack, and is a valid username
  let result = usernameSchema.validate(queryUsername);
  if (result.error) {
    console.warn(
      "JOI Validation failed when loading profile: \n",
      result.error
    );
    res.redirect("/");
    return;
  }

  let { currentUser, queriedUser } = await getUserProfiles(
    queryUsername,
    currentUsername
  );

  if (!queriedUser) {
    // Should never occur, since we have to validate the session first, but just in case this does happen, redirect to 404 :)
    res.redirect("/noUser");
    return;
  }

  if (
    queriedUser.userSkills != undefined &&
    queriedUser.userSkills.length > 0
  ) {
    quieriedUserSkills = await userSkillsCollection
      .find({
        _id: { $in: queriedUser.userSkills },
      })
      .toArray();
  }

  let ratedBefore = await ratingsCollection.findOne({
    userID: currentUser._id,
    ratedID: queriedUser._id,
  });

  let currentUserHistory = currentUser.history.visited;

  //If the current user has been viewed before, remove them from the history so we can readd them at the front
  updateUserHistory(currentUserHistory, queriedUser, currentUser);

  res.render("profile", {
    userCard: new userCard(
      queriedUser.username,
      quieriedUserSkills,
      queriedUser.email,
      queriedUser.userIcon,
      queriedUser.userLocation
    ),
    uploaded: req.query.success,
    referrer: referrer,
    ratedBefore: ratedBefore,
  });
}

/**
 * Gets the profile of the currently logged in user and the user whos profile we are trying to view.
 * @param {String} queryUsername
 * @param {String} currentUsername
 * @returns {Document[]} the currentUser and queriedUser profiles, in that order.
 */
async function getUserProfiles(queryUsername, currentUsername) {
  let currentUser;
  let queriedUser;

  // Check if logged in user and viewer are the same
  if (queryUsername != currentUsername) {
    let results = await userCollection
      .find({
        username: { $in: [queryUsername, currentUsername] },
      })
      .toArray();
    results.forEach((user) => {
      if (user.username == currentUsername) {
        currentUser = user;
      } else {
        queriedUser = user;
      }
    });
  } else {
    //If they are the same, we can assign currentUser to queriedUser
    currentUser = await userCollection.findOne({
      username: currentUsername,
    });
    queriedUser = currentUser;
  }
  return { currentUser, queriedUser };
}

/**
 * Updates the current users history, if the current user is not the queried user
 * @param {ObjectId[]} currentUserHistory
 * @param {Document} queriedUser
 * @param {Document} currentUser
 */
function updateUserHistory(currentUserHistory, queriedUser, currentUser) {
  currentUserHistory.forEach((user, index) => {
    if (user.equals(queriedUser._id)) {
      currentUserHistory.splice(index, 1);
    }
  });

  // We dont need to update history if viewing your own profile
  if (!queriedUser._id.equals(currentUser._id)) {
    currentUserHistory.splice(0, 0, queriedUser._id);
    if (currentUserHistory.length > 8) {
      currentUserHistory.length = 8;
    }
    userCollection.updateOne(
      { _id: currentUser._id },
      {
        $set: {
          "history.visited": currentUserHistory,
        },
      }
    );
  }
}

function editProfile(req, res) {
  res.render("editProfile", {
    name: getUsername(req),
    email: getEmail(req),
  });
}

/**
 * Updates the user on MongoDB with the given data object.
 * IT HAS SOME CONSEQUENCES IF YOU USE IT WRONG. PLEASE UNDERSTAND THE FUNCTION BEFORE ATTEMPTING TO USE IT.
 * @param {Request} req
 * @param {Object} data This should be formatted in the same way our MongoDB user collection is. It will simply overwrite any existing attributes with the new ones, which removes the complication of trying to have multiple potential reads/writes to the database.
 */
async function updateMongoUser(req, data) {
  await userCollection.updateOne(
    { username: getUsername(req) },
    {
      $set: data,
    }
  );
}

// ---------------------------------------------------------------------//
// --------------------FUNCTIONS TO UPDATE DEPENDING ON IMAGE -----------//
// ---------------------------------------------------------------------//

/* #region ------------ PORTFOLIIO EDITING --------------------------- */

async function updatePortfolio(req, res) {
  const skill = req.query.skill;
  let description = req.body.description;
  let currentSkill = userSkillsCollection.findOne({ name: skill });
  // data = JSON.parse(data);
  // data = removeEmptyAttributes(data);
  let currentUser = userCollection.findOne({
    username: getUsername(req),
  });
  let image = null;
  let imgPromise = null;

  if (req.file) {
    imgPromise = cloudinary.uploader
      .upload(req.file.path)
      .then((result) => {
        let scheme = "/upload/";
        image = result.url.split(scheme)[1];
      })
      .catch((err) => {
        console.error("Countered error when uploading to cloudinary:\n", err);
        return res.status(500).json({
          success: false,
          message: `Error: ${err}`,
        });
      });
  }

  [currentUser, currentSkill] = await Promise.all([
    currentUser,
    currentSkill,
    imgPromise,
  ]);

  let index = 0;
  let found = false;

  //if the user has a portfolio, we need to find the right one
  let userKeys = Object.keys(currentUser);
  if (userKeys.includes("portfolio") && currentUser.portfolio.length) {
    currentUser.portfolio.forEach((obj, ind) => {
      //TODO: CB: Fix the fact that title is a string. This shit will drive me nuts.
      if (obj.title == currentSkill._id.toString()) {
        index = ind;
        found = true;
      }
    });
  }

  if (!found) {
    //we push a new array
    let updates = {
      $push: {
        portfolio: {
          title: currentSkill._id.toString(),
          images: [],
          description: description,
        },
      },
    };

    await userCollection.updateOne(
      {
        username: currentUser.username,
      },
      updates
    );
  }

  //we update with the image and data
  let updates = {
    $set: {
      [`portfolio.$.description`]: description,
    },
  };
  if (image) {
    updates["$push"] = { "portfolio.$.images": image };
  }
  await userCollection.updateOne(
    {
      username: currentUser.username,
      "portfolio.title": currentSkill._id.toString(),
    },
    updates
  );

  res.redirect("/profile?id=" + currentUser.username);
}

async function editPortfolio(req, res) {
  if (req.query.id != getUsername(req) || !req.query.skill) {
    res.redirect("/profile");
  } else {
    data = await setupPortfolio(req, res);
    // console.log(data);
    res.render("editPortfolio", data);
  }
}

async function setupPortfolio(req, res) {
  const skill = req.query.skill;
  const username = req.query.id;
  let referrer = req.get("referrer");
  if (referrer == undefined) {
    referrer = "/";
  }

  let gallery = [];
  let description = "";

  let skillData = userSkillsCollection.findOne({
    name: skill,
  });

  let userData = userCollection.findOne({
    username: username,
  });

  [skillData, userData] = await Promise.all([skillData, userData]).catch(
    (err) => {
      res.render("404");
      return null;
    }
  );

  if (Object.keys(userData).includes("portfolio")) {
    userData.portfolio.forEach((item, i) => {
      //TODO: CB: item.title is a string thats the _id of a related skill; we should update it to just be an ObjectId at some point.
      if (item.title === skill._id.toString()) {
        gallery = userData.portfolio[i].images;
        description = userData.portfolio[i].description;
      }
    });
  }

  return {
    title: skill,
    images: gallery,
    banner: skillData.image,
    description: description,
    username: username,
    currentUser: getUsername(req),
    referrer: referrer,
  };
}

/* #region ------------ PORTFOLIIO EDITING --------------------------- */

const profile = {
  edit: editProfile,
  load: loadProfile,
  update: updateProfile,
};

const portfolio = {
  edit: editPortfolio,
  update: updatePortfolio,
};

module.exports = {
  profile,
  portfolio,
};
