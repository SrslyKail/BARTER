/** main entry point of the application. */

/** #region requiredModules */
require("./utils.js");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");

/** #region requiredModules */

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
/* #endregion expressPathing */

/* #region serverRouting */
app.get("/", (req, res) => {
  res.render("index", {});
});

app.get("/login", (req, res) => {
  res.render("login", {});
});

app.get("/password-reset", (req, res) => {
  res.render("password-reset", {});
});

app.get("/profile", (req, res) => {
  res.render("profile", {});
});

app.get("/signup", (req, res) => {
  res.render("signup", {});
});

app.get("/logout", (req, res) => {
  res.render("logout", {});
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
