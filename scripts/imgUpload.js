const express = require("express");
const router = express.Router();
const { getCollection } = require("./modules/databaseConnection");
const userCollection = getCollection("users");
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
  //For Portfolio Item Changing
  const type = req.query.type;
  const item = req.query.item;

  //For Profile Picture Changing
  const name = req.query.name;

  try {
    if (type === "profile") {
      await updatePFP(req, res, name);
    } else if (type === "portfolioItem") {
      await updatePortfolioItem(req, res, item);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

const updatePFP = async (req, res, name) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path);
    let scheme = "/upload/";
    let img = result.url.split(scheme)[1];
    req.session.user.userIcon = formatProfileIconPath(img);

    await UpdateProfileOnMongo(result, name);

    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error uploading the image",
    });
  }
};

const UpdateProfileOnMongo = async (data, name) => {
  let scheme = "/upload/";
  let img = data.url.split(scheme)[1];

  await userCollection.updateOne(
    { username: name },
    {
      $set: {
        userIcon: img,
      },
    }
  );
};

const updatePortfolioItem = async (req, res, item) => {
  res.send(item);
  //   try {
  //     const result = await cloudinary.uploader.upload(req.file.path);
  //     let scheme = "/upload/";
  //     let img = result.url.split(scheme)[1];
  //     req.session.user.userIcon = formatProfileIconPath(img);

  //     await updateItemOnMongo(result, item);

  //     res.redirect("/profile");
  //   } catch (err) {
  //     console.error(err);
  //     res.status(500).json({
  //       success: false,
  //       message: "Error uploading the image",
  //     });
  //   }
  // };

  // const updateItemOnMongo = async (data, item) => {
  //   let scheme = "/upload/";
  //   let img = data.url.split(scheme)[1];

  //   await userCollection.updateOne(
  //     { username: item },
  //     {
  //       $set: {
  //         title: title,
  //       },
  //     }
  //   );
};

module.exports = router;
