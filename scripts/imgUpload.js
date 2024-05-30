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

  //For Portfolio Item Changing
  const id = req.query.id;
  const title = req.body.title;
  const description = req.body.description;

  //For Profile Picture Changing
  const email = req.body.email;

  try {
    if (type === "profile") {
      await updatePFP(req, res, username, email);
    }
    if (type === "portfolio") {
      res.send({
        title: title,
        description: description
      });
      return;
      await updatePortfolio(req);
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
    { username: getUsername(req) },
    {
      $set: data,
    }
  );
};
/* #endregion ----------------- PROFILE PICTURE ---------------------- */

// -------------------- PORTFOLIIO EDITING -----------//

const updatePortfolio = async (req) => {
  try {
    await UpdatePortfolioOnMongo(req);
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error uploading the image",
    });
  }
};

const UpdatePortfolioOnMongo = async (
  req,
  username,
  id,
  title,
  description
) => {
  const index = parseInt(id, 10);

  const user = await userCollection.findOne({ username: username });

  if (!user) {
    throw new Error("User not found");
  }

  if (index >= 0 && index < user.portfolio.length) {
    await userCollection.updateOne(
      { username: username },
      {
        $set: {
          [`portfolio.${index}.title`]: title,
          [`portfolio.${index}.description`]: description,
        },
      }
    );
  } else if (index === user.portfolio.length) {
    await userCollection.updateOne(
      { username: username },
      {
        $push: {
          portfolio: {
            title: title,
            description: description,
            images: [], // Initialize images if necessary
          },
        },
      }
    );
  } else {
    throw new Error("Invalid index");
  }
};

module.exports = router;
