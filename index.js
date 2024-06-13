/** main entry point of the application. */

/* #region requiredModules */
require("./utils.js");
require("dotenv").config();
const express = require("express");

const app = express();

const session = require("express-session");
const bcrypt = require("bcrypt");

const addRatings = require("./scripts/ratings.js").addRatingRoute;

const crypto = require("crypto");
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
  getUser,
  getUsername,
  getUserIcon,
  getEmail,
  defaultIcon,
  formatProfileIconPath,
  getUserId,
  refreshCookieTime,
  userCard,
} = require("./scripts/modules/localSession");

const {
  getMongoStore,
  ObjectId,
  databases,
} = require("./scripts/modules/databaseConnection");
const {
  userCollection,
  skillCatCollection,
  userSkillsCollection,
  ratingsCollection,
} = databases;

const log = require("./scripts/modules/logging").log;
const { sendPasswordResetEmail } = require("./scripts/modules/mailer");

const {
  upload,
  handleProfileChanges,
  updatePortfolio,
  loadProfile,
} = require("./scripts/profile.js");
const { FindCursor, ChangeStream } = require("mongodb");

const skills = require("./scripts/skills");

const skillsCache = {};
const skillCatCache = {};
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
 * Puts all the items from a collection into a cache.
 * Assumes your collection has a _id attribute at the top level
 * @param {FindCursor} coll
 * @param {Object} cache
 */
async function cacheCollection(coll, cache) {
  /* 
    CB: the await here is the secret sauce!
    https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/project/#std-label-node-fundamentals-project
  */
  for await (const item of coll) {
    cache[item._id] = item;
    // console.log(item.name);
  }
}

/**
 *
 * @param {ChangeStream} coll
 */
async function watchForChanges(coll) {
  for await (const change of coll) {
    // console.log(change);
  }
}

async function cacheUserSkills() {
  changeStream = userSkillsCollection.watch();
  watchForChanges(changeStream);
  let allSkills = userSkillsCollection.find({});
  allSkills, skillsCache;
}

async function cacheSkillCats() {
  changeStream = skillCatCollection.watch();
  let allCategories = skillCatCollection.find({});
  cacheCollection(allCategories, skillCatCache);
}

function setupDBSkillCache() {
  // console.log("Setting up cache");
  cacheSkillCats();
  cacheUserSkills();
}

// setupDBSkillCache();

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
  const all = skillCatCollection.find().project({ image: 1, name: 1 });
  // console.log(all)
  /* 
    CB: the await here is the secret sauce!
    https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/project/#std-label-node-fundamentals-project
    */
  let skillCats = [];
  for await (const skillCat of all) {
    // console.log("All:", skill);
    skillCats.push(skillCat);
  }
  // console.log(skillCats);
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

app.get("/profile", loadProfile);

/**
 * Edit Profile Page.
 */
app.get("/editProfile", (req, res) => {
  res.render("editProfile", {
    name: getUsername(req),
    email: getEmail(req),
  });
});

/**
 * Portfolio Page.
 */
app.get("/portfolio", async (req, res) => {
  data = await setupPortfolio(req, res);
  if (data) {
    res.render("portfolio", data);
  }
});

app.get("/editPortfolio", async (req, res) => {
  if (req.query.id != getUsername(req) || !req.query.skill) {
    res.redirect("/profile");
    return;
  }
  data = await setupPortfolio(req, res);
  // console.log(data);
  res.render("editPortfolio", data);
});

async function setupPortfolio(req, res) {
  const skill = req.query.skill;
  const username = req.query.id;
  let gallery = [];
  let description = "";

  let skillData = userSkillsCollection.findOne({
    name: skill,
  });

  let userData = userCollection.findOne({
    username: username,
  });

  let results = await Promise.all([skillData, userData]).catch((err) => {
    res.render("404");
    return null;
  });

  skillData = results[0];
  userData = results[1];

  if (Object.keys(userData).includes("portfolio")) {
    for (let i = 0; i < userData.portfolio.length; i++) {
      //CB :title is a string thats the _id of a related skill; we should update it to just be an ObjectId at some point.
      if (userData.portfolio[i].title === skillData._id.toString()) {
        gallery = userData.portfolio[i].images;
        description = userData.portfolio[i].description;
      }
    }
  }

  let referrer = req.get("referrer");
  //Check current user.
  let currentUser = getUser(req);
  if (referrer == undefined) {
    referrer = "/";
  }

  return {
    title: skill,
    images: gallery,
    banner: skillData.image,
    description: description,
    username: username,
    currentUser: getUsername(req),
    referrer: referrer,
  };
}

app.post("/editPortfolio/upload", upload.single("image"), updatePortfolio);

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

app.post(
  "/editProfile/upload",
  upload.single("userIcon"),
  handleProfileChanges
);

/**
 * History Page.
 */
app.get("/history/:filter", async (req, res) => {
  const filter = req.params.filter;

  let users = [];

  //Check current user.
  let currentUser = getUser(req);

  if (!currentUser) {
    res.redirect("/");
    return;
  }

  currentUser = await userCollection.findOne({
    username: getUsername(req),
  });

  // console.log(currentUser.history.visited);

  const data = userCollection.find({
    _id: { $in: currentUser.history[filter] },
  });
  // console.log(typeof data)

  for await (const user of data) {
    skillNames = userSkillsCollection.find({ _id: { $in: user.userSkills } });
    let userSkills = [];
    for await (const skill of skillNames) {
      userSkills.push(skill);
    }
    users.push(
      new userCard(
        user.username,
        userSkills,
        user.email,
        user.userIcon,
        user.userLocation
      )
    );
    // console.log(newUserCard);
  }

  res.render("history", {
    data: users,
    filter: filter,
    formatProfileIconPath: formatProfileIconPath,
  });
});

app.get("/history", (req, res) => {
  res.render("history", {});
});

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
    return res.status(400).send("Invalid or expired token");
  }

  // Check if token has expired (more than 5 minutes)
  const timestamp = user.resetTokenTimestamp;
  const currentTimestamp = new Date().getTime();
  const timeDifference = currentTimestamp - timestamp;
  const fiveMinutes = 5 * 60 * 1000;

  if (timeDifference > fiveMinutes) {
    // Token has expired, invalidate it
    await userCollection.updateOne(
      { resetToken: token },
      { $unset: { resetToken: "", resetTokenTimestamp: "" } }
    );
    return res.status(400).send("Token expired");
  }

  // Render the password reset page
  res.render("passwordChange", { token });
});

//searches for the user in the database with the provided email.
app.post("/passwordResetting", async (req, res) => {
  var email = req.body.email;
  // Generate a unique token
  const token = crypto.randomBytes(20).toString("hex");
  const timestamp = new Date().getTime();

  let result;

  try {
    // Associate token with user's email in the database
    await userCollection.updateOne(
      { email: email },
      {
        $set: {
          resetToken: token,
          resetTokenTimestamp: timestamp,
        },
      }
    );

    req.session.resetEmail = email;

    // Send password reset email
    await sendPasswordResetEmail(email, token, timestamp);
  } catch (error) {
    console.error("Error initiating password reset:", error);
    // Handle errors
    res.redirect("/passwordReset", { result: `unexpected error:\n ${error}` });
    return;
  }
  // Redirect to a page indicating that the email has been sent
  result = `A password reset link has been sent to your email.<br><br> Please follow the instructions in the email to change your password.`;

  res.render("passwordReset", { result: result });
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
    console.error(passwordValidationResult.error);
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
    res.redirect("/passwordChange");
    return;
  }

  // If reset token is valid, hash the new password
  var newPassword = await bcrypt.hash(password, saltRounds);

  await userCollection.findOneAndUpdate(
    { email: req.session.resetEmail },
    {
      $set: { password: newPassword },
      $unset: {
        resetToken: "",
        resetTokenTimestamp: "",
      },
    }
  );

  res.redirect("/login?passChange=true");
});

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
