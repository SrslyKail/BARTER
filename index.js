/** main entry point of the application. */

/* #region requiredModules */
require("./utils.js");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');

/* #endregion requiredModules */

const saltRounds = 12;

const port = process.env.PORT || 4000;
const app = express();
const Joi = require("joi");

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 HOUR

/* #region secrets */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const nodemailer_user = process.env.NODEMAILER_USER;
const nodemailer_password = process.env.NODEMAILER_PASSWORD;
/* #endregion secrets */

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");
const profileCollection = database.db(mongodb_database).collection("profiles");

/* creates a mondodb store for session data*/
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret,
    },
});

/* #region middleware */
app.use(
    session({
        secret: node_session_secret,
        store: mongoStore, //default is memory store
        saveUninitialized: false,
        resave: true,
    })
);

/**
 * sets the view engine to ejs, configures the express app,
 * and sets up the middleware for parsing url-encoded data.
 */
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

/* #endregion middleware */

/* #region expressPathing */
app.use(express.static(__dirname + "/public"));
app.use("/styles", express.static("./styles"));
app.use("/scripts", express.static("./scripts"));

/* #endregion expressPathing */

/**
 *
 */
app.use("/", (req, res, next) => {
    app.locals.authenticated = req.session.authenticated;
    next();
});

/* #region serverRouting */
app.get("/", async (req, res) => {
    var username = req.session.username;
    var authenticated = req.session.authenticated;
/* Mock database for presentation*/
    var db = JSON.parse(fs.readFileSync("mockCategoryDB.json"));
    res.render("index", { authenticated: authenticated, username: username, db: db });
});

/**
 * Post method for Try Again btn in loginInvalid.ejs
 */
app.post("/login", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    var passChange = req.query.passChange;
    res.render("login", {
        passChange: passChange,
    });
});

/**
 * Post method for login form in login.ejs
 *
 * Uses Joi to validate authentication.
 * Compares the entered password with the bcrypted password in database for authentication.
 *
 * Once successfully logged in, redirects to the main.ejs page.
 */
app.post("/loggingin", async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    const emailSchema = Joi.string().email().required();
    const emailValidationResult = emailSchema.validate(email);
    if (emailValidationResult.error != null) {
        console.log(emailValidationResult.error);
        res.redirect("/login");
        return;
    }

    const result = await userCollection
        .find({ email: email })
        .project({ username: 1, password: 1, _id: 1 })
        .toArray();

    if (result.length != 1) {
        res.redirect("/loginInvalid");
        return;
    }
    if (await bcrypt.compare(password, result[0].password)) {
        req.session.authenticated = true;
        req.session.username = result[0].username;
        req.session.user_type = result[0].user_type;
        req.session.cookie.maxAge = expireTime;

        res.redirect("/");
        return;
    } else {
        res.redirect("/loginInvalid");
        return;
    }
});

app.get("/loginInvalid", async (req, res) => {
    res.render("loginInvalid");
});

/**
 * this works under the assumption that profiles are stored in a separate collection,
 * that usernames are unique, and that a document in the profile collection is created upon registration
 * (this either needs to be changed or implemented)
 */
app.get("/profile", async (req, res) => {
    if (!req.session.authenticated) {
        res.redirect("/login");
        return;
    }
    //TODO: Add JOI validation for the request.query.id; a user could manually enter this into the nav bar so its possible for it to be a database attack.

    profile = await getUserProfile(req.query.id);
    console.log(profile);
    //if we cant find the requested profile, get the current users profile
    if (!profile) {
        profile = await getUserProfile(req.session.username);
        // Should never occur, since we have to validate the session first, but just in case this does happen, redirect to 404 :)
        if (!profile) {
            console.error(`Could not find profile page for ${username}!`);
            res.redirect("/noUser");
        }
    }

    // ! We need to check the user has skills and a location set; otherwise we can crash.
    res.render("profile", {
        user: profile.username,
        location: profile.location,
        skills: profile.skills,
    });
});

async function getUserProfile(username) {
    //searches for document with given username
    //and projects the location field value of found document
    return await profileCollection.findOne({ username: username });
}



/**
 *  Create a nodemailer transporter
 */
const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: nodemailer_user,
        pass: nodemailer_password,
    },
});


/**
 * Function to send password reset email
 * @param {*} email User's email
 * @param {*} token Received token
 * @param {*} timestamp Time when the token was generated
 */
async function sendPasswordResetEmail(email, token, timestamp) {
    const mailOptions = {
        from: 'barter.bby14@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
            `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
            `http://localhost:${port}/passwordReset/${token}\n\n` +
            `The link will expire in 5 minutes\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent');
    } catch (error) {
        console.error('Error sending password reset email:', error);
    }
}

/**
 * Handles all the resetting code.
 */
app.get("/passwordReset", (req, res) => {
    res.render("passwordReset", {});
});


app.get("/passwordReset/:token", async (req, res) => {
    const token = req.params.token;

    // Check if token exists in the database
    const user = await userCollection.findOne({ resetToken: token });

    if (!user) {
        // Token not found or expired
        return res.status(400).send('Invalid or expired token');
    }

    // Check if token has expired (more than 5 minutes)
    const timestamp = user.resetTokenTimestamp;
    const currentTimestamp = new Date().getTime();
    const timeDifference = currentTimestamp - timestamp;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDifference > fiveMinutes) {
        // Token has expired, invalidate it
        await userCollection.updateOne({ resetToken: token },
            { $unset: { resetToken: "", resetTokenTimestamp: "" } });
        return res.status(400).send('Token expired');
    }

    // Render the password reset page
    res.render("passwordChange", { token });
});


//searches for the user in the database with the provided email.
app.post("/passwordResetting", async (req, res) => {
    var email = req.body.email;

    // Generate a unique token
    const token = crypto.randomBytes(20).toString('hex');
    const timestamp = new Date().getTime();

    try {
        // Associate token with user's email in the database
        await userCollection.updateOne({ email: email }, {
            $set: {
                resetToken: token,
                resetTokenTimestamp: timestamp
            }
        });

        req.session.resetEmail = email;

        // Send password reset email
        await sendPasswordResetEmail(email, token, timestamp);

        // Redirect to a page indicating that the email has been sent
        res.render("passwordResetSent", { email });
    } catch (error) {
        console.error('Error initiating password reset:', error);
        // Handle errors
        res.redirect("/passwordReset");
    }

});

//user has been found, so lets change the email now.
app.get("/passwordChange", (req, res) => {
    res.render("passwordChange", {});
});

//changing password code
app.post("/passwordChanging", async (req, res) => {
    var password = req.body.password;
    var confirmPassword = req.body.confirmPassword;

    const passwordSchema = Joi.string().max(20).required();
    const passwordValidationResult = passwordSchema.validate(password);

    if (passwordValidationResult.error != null) {
        console.log(passwordValidationResult.error);
        res.redirect("/passwordChange");
        return;
    }

    // Check if both password fields match
    if (password !== confirmPassword) {
        res.redirect("/passwordChange");
        return;
    }

    // Check if reset token is valid
    const resetToken = req.body.resetToken; // Assuming resetToken is submitted along with the password change request
    const user = await userCollection.findOne({ resetToken: resetToken });

    if (!user) {
        // If reset token is not valid, redirect to password change page
        return res.redirect("/passwordChange");
    }

    // If reset token is valid, hash the new password
    var newPassword = await bcrypt.hash(password, saltRounds);

    await userCollection.findOneAndUpdate(
        { email: req.session.resetEmail },
        {
            $set: { password: newPassword },
            $unset: {
                resetToken: "",
                resetTokenTimestamp: ""
            }
        }
    );

    res.redirect("/login?passChange=true");
});

/**
 * Post method for submitting a user from signup
 * Validates fields and checks for duplicate email/username
 * Then inserts a user, creates a session, and redirects to root.
 */
//Added signup route back.
app.get("/signup", (req, res) => {
    res.render("signup", {
        errors: [],
    });
});

app.post("/submitUser", async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;
    var errors = [];

    //this should be global
    const userSchema = Joi.object({
        username: Joi.string().alphanum().max(20).required(),
        password: Joi.string().max(20).required(),
        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "ca"] } })
            .required(),
    });

    const validationResult = userSchema.validate({ username, password, email });
    //Error checking
    if (validationResult.error != null) {
        errors.push(validationResult.error.details[0].message);
    }
    // Check for duplicate username or email
    if (await userCollection.findOne({ username: username })) {
        errors.push(`${username} is already in use!`);
    }
    if (await userCollection.findOne({ email: email })) {
        errors.push(`${email} is already in use!`);
    }
    //No errors? Create a user
    if (errors.length === 0) {
        // Hash password
        var hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert into collection
        await userCollection.insertOne({
            username: username,
            email: email,
            password: hashedPassword,
        });

        createSession(req, username, false);
        res.redirect("/");
        return;
    } else {
        //catch-all redirect to signup, sends errors
        res.render("signup", {
            errors: errors,
        });
        return;
    }
});

/**
 * Sets the authentication, username, and expiration date for the session
 * @param {Request} req
 */
function createSession(req, username, isAdmin) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.isAdmin = isAdmin;
    req.session.cookie.maxAge = expireTime;
}

/**
 * Post method for logout buttons.
 */
app.post("/logout", async (req, res) => {
    res.redirect("/logout");
});

app.get("/logout", (req, res) => {
    req.session.destroy(); // Deletes the session
    res.redirect("/"); // Sends back to the homepage
});

app.post("/searchSubmit", (req, res) => {
    //TODO: Search Code.
});
/**
 * handles all routes that are not matched by any other route.
 * renders a 404 page and sets the response status to 404.
 */
app.get("*", (req, res) => {
    res.status(404);
    res.render("404");
});

/* #endregion serverRouting */

/** starts the server and listens on the specified port */
app.listen(port, () => {
    console.log("Node application listening on port " + port);
});
