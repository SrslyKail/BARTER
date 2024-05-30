const express = require("express");
const router = express.Router();
const { getCollection } = require("./modules/databaseConnection");
const userCollection = getCollection("users");
const userSkillsCollection = getCollection("skills");
const formatProfileIconPath =
  require("./modules/localSession").formatProfileIconPath;
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

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

router.post("/upload", upload.single("image"), async function (req, res) {
  //Init for both
  const type = req.query.type;
  const username = req.query.username;
  const method = req.query.method;

  //For Portfolio Item Changing
  const skill = req.query.skill;
  const title = req.body.title;
  const description = req.body.description;

  //For Profile Picture Changing
  const email = req.body.email;

  try {
    if (type === "profile") {
      await updatePFP(req, res, username, email);
    }
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
});

// ---------------------------------------------------------------------//
// --------------------FUNCTIONS TO UPDATE DEPENDING ON IMAGE -----------//
// ---------------------------------------------------------------------//

/* #region ----------------- PROFILE PICTURE -------------------------- */
const updatePFP = async (req, res, username, email) => {
  try {
    const data = await cloudinary.uploader.upload(req.file.path);
    let img = data.url.split("/upload/")[1].split("/")[1].split(".")[0];
    req.session.user.userIcon = formatProfileIconPath(img);

    await UpdateProfileOnMongo(data, username, email);

    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error uploading the image",
    });
  }
};

const UpdateProfileOnMongo = async (data, username, email) => {
  let scheme = "/upload/";
  let img = data.url.split(scheme)[1];

  await userCollection.updateOne(
    { username: username },
    {
      $set: {
        userIcon: img,
      },
    }
  );
};
/* #endregion ----------------- PROFILE PICTURE ---------------------- */

/* #region ------------ PORTFOLIIO EDITING --------------------------- */
const editPortfolioItem = async (req, res, username, skill, description) => {
  try {
    await editPortfolioOnMongo(req, res, username, skill, description);
    return;
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error editing the image",
    });
  }
};

const editPortfolioOnMongo = async (req, res, username, skill, description) => {
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
};
/* #region ------------ PORTFOLIIO EDITING --------------------------- */

module.exports = router;
