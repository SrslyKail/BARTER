/** main entry point of the application. */

/* #region requiredModules */
require("./utils.js");
require("dotenv").config();
const express = require("express");

const app = express();

const session = require("express-session");
const bcrypt = require("bcrypt");

const addRatings = require("./scripts/ratings.js").addRatingRoute;

const Joi = require("joi");

const multer = require("multer");
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

/* #endregion requiredModules */
/* #region userImports */
const saltRounds = 12;

const port = process.env.PORT || 4000;

const {
  isAuthenticated,
  createSession,
  getUsername,
  getUserIcon,
  defaultIcon,
  getUserId,
  refreshCookieTime,
} = require("./scripts/modules/localSession");

const {
  getMongoStore,
  databases,
} = require("./scripts/modules/databaseConnection");
const { userCollection, skillCatCollection, userSkillsCollection } = databases;

const log = require("./scripts/modules/logging").log;

const profile = require("./scripts/profile.js");
const portfolio = require("./scripts/portfolio");

const skills = require("./scripts/skills");

const history = require("./scripts/history");
const password = require("./scripts/password.js");
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

/** middleware function for catching bad skill/category parameters */

//TODO: CB: Test is we can move these into the skills.js script, or, alternatively, into a middleware script file.
async function validateSkillParam(req, res, next) {
  const param = req.params;
  const test = await userSkillsCollection.findOne({ name: param.skill });
  if (test == null) {
    res.status(404).json({ message: "Skill not found." });
  } else {
    next();
  }
}

async function validateCatParam(req, res, next) {
  const param = req.params;
  const test = await skillCatCollection.findOne({ name: param.skillCat });
  if (test == null) {
    res.status(404).json({ message: "Category not found." });
  } else {
    next();
  }
}

async function checkAuth(req, res, next) {
  if (isAuthenticated(req)) {
    next();
  } else {
    res
      .status(401)
      .json({ message: "You are not authorized to submit ratings." });
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

app.get("/category/:skillCat", validateCatParam, skills.loadSkillCat);

app.get("/skill/:skill", validateSkillParam, skills.loadSkillPage);

app.post("/remove-skill/:skillID", checkAuth, skills.removeSkill);

app.post("/add-skill/:skillID", checkAuth, skills.addSkill);

/* #region profileRoutes */

app.get("/profile", profile.load);

app.get("/editProfile", profile.edit);

app.post("/editProfile/upload", upload.single("userIcon"), profile.update);

/* #endregion profileRoutes */

/**
 * Portfolio Page.
 */
app.get("/portfolio", async (req, res) => {
  data = await setupPortfolio(req, res);
  if (data) {
    res.render("portfolio", data);
  }
});

app.get("/editPortfolio", portfolio.edit);

app.post("/editPortfolio/upload", upload.single("image"), portfolio.update);

/**
 * Add Portfolio Page.
 */
app.get("/addPortfolio", async (req, res) => {
  const username = req.query.username;

  if (!username) {
    res.redirect("/profile");
    return;
  }

  res.render("addPortfolio", {
    username: username,
  });
});

/**
 * History Page.
 */
app.get("/history/:filter", history.filter);

app.get("/history", history.show);

/**
 * Handles all the resetting code.
 */
app.get("/passwordReset", password.requestReset);

app.get("/passwordReset/:token", password.reset);

//searches for the user in the database with the provided email.
app.post("/sendResetEmail", password.sendResetEmail);

//user has been found, so lets change the email now.
app.get("/passwordChange", password.change);

// ? CB: I don't think passwordUpdate is used at the moment.
//changing password code
app.post("/passwordUpdate", password.update);

app.post("/submitUser", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  let geo = {
    longitude: Number(req.body.long),
    latitude: Number(req.body.lat),
  };
  var errors = [];

  //this should be global
  const userSchema = Joi.object({
    username: Joi.string().alphanum().max(20).required(),
    password: Joi.string().max(20).required(),
    email: Joi.string()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ["com", "net", "ca"] },
      })
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
  } else if (errors.length === 0) {
    //No errors? Create a user!
    // Hash password
    var hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert into collection
    let newDoc = await userCollection.insertOne({
      username: username,
      email: email,
      password: hashedPassword,
      isAdmin: false,
      userLocation: {
        geo: geo,
      },
      contactInfo: {
        email: email,
      },
      userIcon: defaultIcon,
      history: { visited: [], contacted: [] },
      userSkills: [],
    });

    createSession(
      req,
      username,
      email,
      newDoc.insertedId,
      { visited: [], contacted: [] },
      false
    );

    res.redirect("/");
    return;
  }
  //catch-all redirect to signup, sends errors
  res.render("signup", {
    errors: errors,
  });
  return;
});

/**Post to submit rating from profile. */
app.post("/submit-rating", checkAuth, addRatings);

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
    console.error(emailValidationResult.error);
    res.redirect("/login");
    return;
  }

  const result = await userCollection.find({ email: email }).toArray();
  if (
    result.length == 1 &&
    (await bcrypt.compare(password, result[0].password))
  ) {
    const user = result[0];
    createSession(
      req,
      user.username,
      user.email,
      user._id,
      user.history,
      user.isAdmin,
      user.userIcon
    );
    res.redirect("/");
    return;
  } else {
    res.render("/loginInvalid");
    return;
  }
});

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
  socket.on("position", async (position) => {
    // req.session.position = position.geo;
    // console.log(position.geo);
    // if (position.id.length == 24) {
    //   console.log(position.id);
    //   await userCollection
    //     .findOne({
    //       _id: ObjectId.createFromHexString(position.id),
    //     })
    //     .then((col) => {
    //       console.log(col);
    //     });
    // }
  });
});
