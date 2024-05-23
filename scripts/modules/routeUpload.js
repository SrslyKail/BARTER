const express = require("express");
const router = express.Router();
const cloudinary = require("./cloudinary");
const upload = require("./multer");
const { getCollection } = require("./databaseConnection");
const profileCollection = getCollection("profiles");

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

        changePFPOnMongo(result, req.query.name);

        res.redirect("/profile");
    });
});

const changePFPOnMongo = async (data, name) => {
    let scheme = "/upload/";
    let img = data.url.split(scheme)[1];

    console.log("Image: " + img);
    console.log("Name: " + name);
    await profileCollection.updateOne(
        { username: name },
        {
            $set: {
                userIcon: img,
            },
        }
    );
};

module.exports = router;
