const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const {
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

router.post("/upload", upload.single("userIcon"), async function (req, res) {
  let data = JSON.stringify(req.body);
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
      data["userIcon"] = img;
      console.log(data);
      req.session.user.userIcon = formatProfileIconPath(img);
    });
  }
  await updateMongoProfile(req, data);
  res.redirect("/profile");
});

async function updateMongoProfile(req, data) {
  data = JSON.parse(data);
  let keys = Object.keys(data);
  if (keys.includes("longitude")) {
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
  await userCollection.updateOne(
    { username: getUsername(req) },
    {
      $set: data,
    }
  );
}

module.exports = router;
