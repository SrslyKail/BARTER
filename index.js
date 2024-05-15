/** main entry point of the application. */

/* #region requiredModules */
require("./utils.js");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");

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
/* #endregion secrets */

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");

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

/* #region serverRouting */
app.get("/", (req, res) => {
  res.render("index", {});
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
 * Added the profile back, sorry ben ;-;
 */
app.get("/profile", (req, res) => {
  res.render("profile", {});
});

/**
 * Handles all the resetting code.
 */
app.get("/passwordReset", (req, res) => {
  res.render("passwordReset", {});
});
//searches for the user in the database with the provided email.
app.post("/passwordResetting", async (req, res) => {
  var email = req.body.email;
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
  //if not found, return back to the reset page.
  if (result.length != 1) {
    res.redirect("/passwordReset");
    return;
  }

  req.session.resetEmail = email;
  req.session.cookie.maxAge = 5 * 1000; //expires in 5 minutes
  res.redirect("/passwordChange");
});

//user has been found, so lets change the email now.
app.get("/passwordChange", (req, res) => {
  res.render("passwordChange", {});
});

//changing password code
app.post("/passwordChanging", async (req, res) => {
  var password = req.body.password;
  const passwordSchema = Joi.string().max(20).required();
  const passwordValidationResult = passwordSchema.validate(password);
  if (passwordValidationResult.error != null) {
    console.log(passwordValidationResult.error);
    res.redirect("/passwordChange");
    return;
  }

  var newPassword = await bcrypt.hash(password, saltRounds);

  await userCollection.findOneAndUpdate(
    { email: req.session.resetEmail },
    { $set: { password: newPassword } }
  );
  //destroys the session, as don't need session.resetEmail anymore
  req.session.destroy();
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
  if (await userCollection.findOne({ username: username })) {
    errors.push(`${username} is already in use!`);
  }
  if (await userCollection.findOne({ email: email })) {
    errors.push(`${email} is already in use!`);
  }
  //No errors? Create a user
  if (errors.length === 0) {
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
  res.redirect("/", {}); // Sends back to the homepage
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
