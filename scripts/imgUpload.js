const express = require("express");
const router = express.Router();

const formatProfileIconPath =
  require("./modules/localSession").formatProfileIconPath;
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
async function processProfileChanges(req, res) {
  //Shinanigans required to get the body and be able to edit it.
  let data = JSON.stringify(req.body);
  data = JSON.parse(data);
  data = removeEmptyAttributes(data);
  if (req.file) {
    await cloudinary.uploader.upload(req.file.path, function (err, result) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Error",
        });
      } else {
        //console.log("result:", res);
        let scheme = "/upload/";
        let img = result.url.split(scheme)[1];
        data["userIcon"] = img;
        // console.log("Uploaded image:", data);
        req.session.user.userIcon = formatProfileIconPath(img);
      }
    });
  }
  //If the user submitted no valid data, we dont upload anything to Mongo
  if (Object.keys(data) > 0) {
    await updateMongoUser(req, data);
  }
  res.redirect("/profile");
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
 *
 * @param {Request} req
 * @param {Object} data This should be formatted in the same way our MongoDB user collection is. It will attempt to map all give attributes
 */
async function updateMongoUser(req, data) {
  await userCollection.updateOne(
    { username: getUsername(req) },
    {
      $set: data,
    }
  );
}

module.exports = { upload, processProfileChanges };
