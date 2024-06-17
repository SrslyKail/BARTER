/** main entry point of the application. */

/* #region requiredModules */
require("./utils.js");
require("dotenv").config();

const express = require("express");

const app = express();

const session = require("express-session");

const ratings = require("./scripts/ratings.js");

const multer = require("multer");
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

/* #endregion requiredModules */
/* #region userImports */

const port = process.env.PORT || 4000;

const {
  isAuthenticated,
  getUsername,
  getUserIcon,
  getUserId,
  refreshCookieTime,
} = require("./scripts/modules/localSession");

const {
  getMongoStore,
  databases,
} = require("./scripts/modules/databaseConnection");
const { skillCatCollection } = databases;

const log = require("./scripts/modules/logging").log;

const profile = require("./scripts/profile.js");
const portfolio = require("./scripts/portfolio");
const skills = require("./scripts/skills");
const history = require("./scripts/history");
const password = require("./scripts/password.js");
const account = require("./scripts/account.js");

/* #endRegion userImports */

/* #region secrets */
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* #endregion secrets */

/* #region expressPathing */
app.use(express.static(__dirname + "/public"));
app.use("/imgs", express.static("./imgs"));
app.use("/styles", express.static("./styles"));
app.use("/scripts", express.static("./scripts"));
app.use("/audio", express.static("./audio"));
/* #endregion expressPathing */

/* #region middleware */
//! CB:I'm not even sure this does anything. We don't actually use it anywhere.
app.use(
  session({
    secret: node_session_secret,
    store: getMongoStore(), //default is memory store
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

/**
 * Generate local variables we need for every page
 */
app.use((req, res, next) => {
  // console.log(req.session.user);
  refreshCookieTime(req);
  req.session.user != "undefined"
    ? (app.locals.user = req.session.user)
    : undefined;
  app.locals.authenticated = isAuthenticated(req);
  app.locals.userIcon = getUserIcon(req);
  app.locals.modalLinks = generateNavLinks(req);
  app.locals._id = getUserId(req);
  // Classic ternary operator to deal with undefined and null :)
  app.locals.zamn = req.session.zamn ? true : false;

  next();
});

async function checkAuth(req, res, next) {
  if (isAuthenticated(req)) {
    next();
  } else {
    res.status(401).json({ message: "You are not authorized to do that." });
  }
}

/* #endregion middleware */

/* #region helperFunctions */

/**
 * Generates the navlinks we want a user to access based on permissions
 * within the local session.
 * @param {Request} req
 * @returns {Array}
 */
function generateNavLinks(req) {
  const modalArray = [];
  if (isAuthenticated(req)) {
    modalArray.push(
      { name: "View Profile", link: "/profile" },
      { name: "History", link: "/history/visited" },
      { name: "Settings", link: "/settings" },
      { name: "Legal", link: "/legal" },
      { name: "Log out", link: "/logout" }
    );
    // CB: We can uncomment this if we add an admin page
    // if (isAdmin(req)) {
    //   modalArray.push({ name: "Admin", link: "/admin" });
    // }
  } else {
    modalArray.push(
      { name: "Log in", link: "/login" },
      { name: "Sign up", link: "/signup" }
    );
  }
  return modalArray;
}

/** Sending a rating to the server */

/* #endregion middleware */

/* #region serverRouting */

app.get("/testing", async (req, res) => {
  var username = getUsername(req);
  var authenticated = isAuthenticated(req);

  // console.log(skillCats);
  res.render("testing");
});

app.get("/", async (req, res) => {
  var username = getUsername(req);
  var authenticated = isAuthenticated(req);
  // CB: This will make it so we only show the names; if you want the id, make _id: 1
  const skillCats = await skillCatCollection
    .find()
    .project({ image: 1, name: 1 })
    .toArray();
  /* 
    CB: the await here is the secret sauce!
    https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/project/#std-label-node-fundamentals-project
    */
  // let skillCats = [];
  // for await (const skillCat of all) {
  //   skillCats.push(skillCat);
  // }
  res.render("index", {
    authenticated: authenticated,
    username: username,
    parentPage: "/category",
    db: skillCats,
  });
});

/* #region skillRoutes */

app.get("/category/:skillCat", skills.validateCatParam, skills.loadSkillCat);

app.get("/skill/:skill", skills.validateSkillParam, skills.loadSkillPage);

app.post("/remove-skill/:skillID", checkAuth, skills.removeSkill);

app.post("/add-skill/:skillID", checkAuth, skills.addSkill);

/* #endRegion skillRoutes */

/* #region profileRoutes */

app.get("/profile", profile.load);

app.get("/editProfile", profile.edit);

app.post("/editProfile/upload", upload.single("userIcon"), profile.update);

/* #endregion profileRoutes */

/* #region portfolioRoutes */

app.get("/portfolio", portfolio.load);

app.get("/editPortfolio", portfolio.edit);

app.post("/editPortfolio/upload", upload.single("image"), portfolio.update);

app.get("/addPortfolio", portfolio.add);

/* #endRegion portfolioRoutes */

/**
 * History Page.
 */
app.get("/history/:filter", history.filter);

app.get("/history", history.show);

app.get("/passwordReset", password.requestReset);

app.get("/passwordReset/:token", password.reset);

//searches for the user in the database with the provided email.
app.post("/sendResetEmail", password.sendResetEmail);

//user has been found, so lets change the email now.
app.get("/passwordChange", password.change);

// ? CB: I don't think passwordUpdate is used at the moment.
//changing password code
app.post("/passwordUpdate", password.update);

app.post("/submit-rating", checkAuth, ratings.add);

app.post("/submitUser", account.create);

app.get("/login", account.login);

app.post("/validateLogin", account.validateLogin);

/**
 * Post method for submitting a user from signup
 * Validates fields and checks for duplicate email/username
 * Then inserts a user, creates a session, and redirects to root.
 */
app.get("/signup", (req, res) => {
  res.render("signup", {
    errors: [],
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy(); // Deletes the session
  res.redirect("/"); // Sends back to the homepage
});

app.post("/searchSubmit", (req, res) => {
  //TODO: Search Code.
});

app.get("/zamn", (req, res) => {
  req.session.zamn = !req.session.zamn;
  app.locals.zamn = req.session.zamn;
  res.redirect("back");
});

app.get("/settings", (req, res) => {
  res.render("settings");
});

app.get("/legal", (req, res) => {
  res.render("legal");
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
let server = app.listen(port, () => {
  console.info("Node application listening on port " + port);
});
let io = require("socket.io")(server);
io.on("connection", (socket) => {
  // Not used atm; but could be used in the future for a more accurate "find other user" feature.
  socket.on("position", async (position) => {});
});
