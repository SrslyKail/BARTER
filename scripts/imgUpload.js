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

router.post("/upload", upload.single("image"), function (req, res) {
  cloudinary.uploader.upload(req.file.path, function (err, result) {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Error",
      });
    }

    // console.info({
    //   success: true,
    //   message: "Uploaded!",
    //   data: result,
    // });
    let scheme = "/upload/";
    let img = result.url.split(scheme)[1];
    req.session.user.userIcon = formatProfileIconPath(img);
    UpdateProfileOnMongo(result, req.query.name);

    res.redirect("/profile");
  });
});

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

module.exports = router;
