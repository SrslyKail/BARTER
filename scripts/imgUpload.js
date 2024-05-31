const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const {
  createSession,
  getUsername,
  formatProfileIconPath,
} = require("./modules/localSession");
const { getPlaceName } = require("./modules/location");
const { getCollection } = require("./modules/databaseConnection");

const userCollection = getCollection("users");
const userSkillsCollection = getCollection("skills");

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
  data = handleGeoUpdates(data);
  if (req.file) {
    await cloudinary.uploader
      .upload(req.file.path)
      .then((result) => {
        let scheme = "/upload/";
        let img = result.url.split(scheme)[1];
        data["userIcon"] = img;
        // console.log("Uploaded image:", data);
        req.session.user.userIcon = formatProfileIconPath(img);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Error",
        });
      });
    console.log();
  }
  //If the user submitted no valid data, we dont upload anything to Mongo
  if (Object.keys(data) > 0) {
    await updateMongoUser(req, data);
  }

  let userKeys = Object.keys(req.session.user);
  let updateKeys = userKeys.filter((key) => dataKeys.includes(key));
  updateKeys.forEach((key) => {
    req.session.user[key] = data[key];
  });
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
  let data = JSON.stringify(req.body);
  let currentSkill = userSkillsCollection.findOne({ name: skill });
  // data = JSON.parse(data);
  // data = removeEmptyAttributes(data);
  let currentUser = userCollection.findOne({
    username: getUsername(req),
  });
  let image = null;

  if (req.file) {
    await cloudinary.uploader
      .upload(req.file.path)
      .then((result) => {
        let scheme = "/upload/";
        let img = result.url.split(scheme)[1];
        // console.log("Uploaded image:", data);
        image = img;
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Error",
        });
      });
    console.log();
  }

  let MongoRes = await Promise.all([currentUser, currentSkill]);
  currentUser = MongoRes[0];
  currentSkill = MongoRes[1];

  let index = 0;
  //if the user has a portfolio, we need to find the right onw
  if (Object.keys(currentUser).includes("portfolio")) {
    currentUser.portfolio.forEach((obj, ind) => {
      if (obj.title == currentSkill._id.toString()) {
        index = ind;
      }
    });

  }
  await userCollection.updateOne(
    { username: currentUser.username },
    {
      $set: {
        [`portfolio.${index}.description`]: description,
      },
    }
  );
  if (image) {
    await userCollection.updateOne(
      { username: currentUser.username },
      {
        $push: {
          [`portfolio.${index}.images`]: image,
        },
      }
    );
  }

  res.redirect("/profile?id=" + currentUser.username);
}

async function editPortfolioOnMongo(req, res, username, skill, description) {
  const userData = await userCollection.findOne({ username: username });
  const skillData = await userSkillsCollection.findOne({
    name: skill,
  });
  let index = 0;

  for (let i = 0; i < userData.portfolio.length; i++) {
    if (userData.portfolio[i].title === skillData._id.toString()) {
      index = i;
    }
  }

  await userCollection.updateOne(
    { username: username },
    {
      $set: {
        [`portfolio.${index}.description`]: description,
      },
    }
  );
  res.redirect("/profile?id=" + username);
}
/* #region ------------ PORTFOLIIO EDITING --------------------------- */

module.exports = { upload, handleProfileChanges, updatePortfolio };
