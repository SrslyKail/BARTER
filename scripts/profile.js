const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const {
  getUsername,
  formatProfileIconPath,
  updateSession,
} = require("./modules/localSession");
const { getPlaceName } = require("./modules/location");
const { userCollection, userSkillsCollection } =
  require("./modules/databaseConnection").databases;

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true,
});

const upload = multer({ storage: storage });

/**
 * Handles processing the income changes from editProfile.
 * Checks if the user submitted a profile image and processes it to cloudinary if they did.
 * @param {Request} req
 * @param {Response} res
 */
async function handleProfileChanges(req, res) {
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
        let img = result.url.split(scheme)[1];
        image = img;
      })
      .catch((err) => {
        console.error("Countered error when uploading to cloudinary:\n", err);
        return res.status(500).json({
          success: false,
          message: `Error: ${err}`,
        });
      });
  }

  let MongoRes = await Promise.all([currentUser, currentSkill, imgPromise]);
  currentUser = MongoRes[0];
  currentSkill = MongoRes[1];

  let index = 0;
  let found = false;

  //if the user has a portfolio, we need to find the right onw
  let userKeys = Object.keys(currentUser);
  if (userKeys.includes("portfolio") && currentUser.portfolio.length) {
    currentUser.portfolio.forEach((obj, ind) => {
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
/* #region ------------ PORTFOLIIO EDITING --------------------------- */

module.exports = { upload, handleProfileChanges, updatePortfolio };
