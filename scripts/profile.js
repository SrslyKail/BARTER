const cloudinaryHelper = require("./modules/cloudinaryHelper");
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
  data = await updateUserGeo(data);
  if (req.file) {
    let result = await cloudinaryHelper.upload(req.file.path);
    if (result == null) {
      return cloudinaryHelper.errorPage(res);
    }

    data["userIcon"] = result;
    req.session.user.userIcon = formatProfileIconPath(result);
  }
  //If the user submitted no valid data, we dont upload anything to Mongo
  let dataKeys = Object.keys(data);
  if (dataKeys.length > 0) {
    await updateUserInformation(req, data);
  }
  res.redirect("/profile");
}

/**
 * Handles cleaning and validating the users location so it can be stored in the database in the appropriate format.
 * @param {Object} data - Should be an Object containing longitude and latitude
 * @returns {Object} The long/lat and placename, organized according to the MongoDB Schema
 */
async function updateUserGeo(data) {
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

/**
 * Updates the user in Mongo and their local session.
 * @param {Request} req
 * @param {Object} data - the data to update. Should be organized as per the MongoDB Schema
 */
async function updateUserInformation(req, data) {
  await updateMongoUser(req, data);
  updateSession(req, data);
}

/**
 * Removes any empty attributes from the passed in Object.
 * @param {Object} data - The data to be cleaned up
 * @returns {Object} The cleaned data
 */
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

module.exports = {
  edit: editProfile,
  load: loadProfile,
  update: updateProfile,
};
