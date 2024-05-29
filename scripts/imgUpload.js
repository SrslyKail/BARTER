const express = require("express");
const router = express.Router();
const { getCollection } = require("./modules/databaseConnection");
const userCollection = getCollection("users");
const formatProfileIconPath =
  require("./modules/localSession").formatProfileIconPath;
const multer = require("multer");
const { getUsername } = require("./modules/localSession");
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

router.post("/upload", upload.single("userIcon"), async function (req, res) {
  console.log(req);
  let data = JSON.stringify(req.body);
  console.log(req.file);
  console.warn(data);
  if (req.file) {
    cloudinary.uploader.upload(req.file.path, function (err, result) {
      if (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Error",
        });
      }
      let scheme = "/upload/";
      let img = result.url.split(scheme)[1];
      data[userIcon] = img;
      console.log(data);
      req.session.user.userIcon = formatProfileIconPath(img);
    });
  }
  await updateMongoProfile(data);
  res.redirect("/profile");
});

async function updateMongoProfile(data) {
  console.log(data);
  await userCollection.updateOne(
    { username: getUsername() },
    {
      $set: {
        data,
      },
    }
  );
}

module.exports = router;
