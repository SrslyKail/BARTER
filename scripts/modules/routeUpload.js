const express = require("express");
const router = express.Router();
const cloudinary = require("./cloudinary");
const upload = require("./multer");

router.post("/upload", upload.single("image"), function (req, res) {
    cloudinary.uploader.upload(req.file.path, function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Error",
            });
        }

        console.log({
            success: true,
            message: "Uploaded!",
            data: result,
        });

        res.redirect("/profile");
    });
});

module.exports = router;
