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
  //Init for both
  const type = req.query.type;
  const username = req.query.username; //CB: I think we can just get the current username using getUsername(); nobody should be editing portfolios that aren't their own, right?
  const method = req.query.method;

  //For Portfolio Item Changing
  const skill = req.query.skill;
  const title = req.body.title;
  const description = req.body.description;

  //For Profile Picture Changing
  const email = req.body.email;

  try {
    if (type === "portfolio") {
      if (method === "add") {
        res.send({
          title: title,
          description: description,
        });
      } else if (method === "edit") {
        await editPortfolioItem(req, res, username, skill, description);
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function editPortfolioItem(req, res, username, skill, description) {
  try {
    await editPortfolioOnMongo(req, res, username, skill, description);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error editing the image",
    });
  }
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
