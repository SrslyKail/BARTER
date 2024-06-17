const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  secure: true,
});

const scheme = "/upload/";

async function upload(filePath) {
  try {
    let result = await cloudinary.uploader.upload(filePath);
    return result.url.split(scheme)[1];
  } catch (err) {
    console.error("Failed to upload image to cloudinary:\n", err);
    return null;
  }
}

function errorPage(res) {
  return res.status(500).json({
    success: false,
    message: "Error",
  });
}

module.exports = { upload, errorPage };
