/** main entry point of the application. */

/* #region requiredModules */
require("./utils.js");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const Collection = require("mongodb").Collection;

const crypto = require("crypto");
const fs = require("fs");
const Joi = require("joi");

/* #endregion requiredModules */

const saltRounds = 12;

const port = process.env.PORT || 4000;
const app = express();
const {
  User,
  isAuthenticated,
  isAdmin,
  createSession,
  getUser,
  getUsername,
  getUserIcon,
  getEmail,
  getHistory,
  defaultIcon,
  formatProfileIconPath,
} = require("./scripts/modules/localSession");
const {
  getMongoStore,
  getCollection,
  ObjectId,
} = require("./scripts/modules/databaseConnection");

/** @type {Collection} */
const userCollection = getCollection("users");
/** @type {Collection} */
const skillCatCollection = getCollection("skillCats");
/** @type {Collection} */
const userSkillsCollection = getCollection("skills");

const log = require("./scripts/modules/logging").log;
const sendPasswordResetEmail =
  require("./scripts/modules/mailer").sendPasswordResetEmail;

const uploadRoute = require("./scripts/imgUpload.js");
const { FindCursor, ChangeStream } = require("mongodb");

const skillsCache = {};
const skillCatCache = {};

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
app.use(
  session({
    secret: node_session_secret,
    store: getMongoStore(), //default is memory store
    saveUninitialized: false,
    resave: true,
  })
);

app.use("/editProfile", uploadRoute);

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
  app.locals.user =
    req.session.user != "undefined" ? req.session.user : undefined;
  app.locals.authenticated = isAuthenticated(req);
  app.locals.userIcon = getUserIcon(req);
  app.locals.modalLinks = generateNavLinks(req);
  // Classic ternary operator to deal with undefined and null :)
  req.session.zamn = req.session.zamn ? true : false;
  app.locals.zamn = req.session.zamn;
  next();
});

app.use("/editProfile", uploadRoute);


/** middleware function for catching bad skill/category parameters */
async function validateSkillParam(req, res, next) {
  const param = req.params
  console.log(param.skill)
  const test =  await userSkillsCollection.findOne({name:param.skill})
  if(test==null){
    res.status(404).json({message: "Skill not found."})
  } else {
    next();
  }
}

async function validateCatParam(req, res, next) {
  const param = req.params
  const test =  await skillCatCollection.findOne({name:param.skillCat})
  if(test==null){
    res.status(404).json({message: "Category not found."})
  } else {
    next();
  }
}

/* #endregion middleware */

/* #region helperFunctions */

/** All the arguments the userCard needs */
class userCard {
  constructor(username, location = null, userSkills, email, userIcon) {
    (this.username = username),
      (this.location = location),
      (this.userSkills = userSkills),
      (this.email = email),
      (this.userIcon = formatProfileIconPath(userIcon));
  }
}

/**
 * Puts all the items from a collection into a cache.
 * Assumes your collection has a name attribute at the top-level.
 * @param {FindCursor} coll
 * @param {Object} cache
 */
async function cacheCollection(coll, cache) {
  /* 
    CB: the await here is the secret sauce!
    https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/project/#std-label-node-fundamentals-project
  */
  for await (const item of coll) {
    cache[item.name] = item;
    // console.log(item.name);
  }
}

/**
 *
 * @param {ChangeStream} coll
 */
async function watchForChanges(coll) {
  for await (const change of coll) {
    console.log(change);
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
  console.log("Setting up cache");
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
  const links = [{ name: "Home", link: "/" }];
  const modalArray = [];

  if (isAuthenticated(req)) {
    links.push(
      { name: "Members", link: "/members" },
      { name: "Log out", link: "/logout" }
    );
    modalArray.push(
      { name: "View Profile", link: "/profile" },
      { name: "History", link: "/history/visited" },
      { name: "Settings", link: "/settings" },
      { name: "Legal", link: "/legal" },
      { name: "Log out", link: "/logout" }
    );
    // CB: We can uncomment this if we add an admin page
    // if (isAdmin(req)) {
    //   links.push({ name: "Admin", link: "/admin" });
    // }
  } else {
    links.push(
      { name: "Log in", link: "/login" },
      { name: "Sign up", link: "/signup" }
    );
    modalArray.push(
      { name: "Log in", link: "/login" },
      { name: "Sign up", link: "/signup" }
    );
  }
  return modalArray;
}

/* #endregion middleware */

/* #region serverRouting */
app.get("/", async (req, res) => {
  var username = getUsername(req);
  var authenticated = isAuthenticated(req);
  /* Mock database for presentation*/
  //   var db = skillCatCollection;
  // var db = JSON.parse(fs.readFileSync("mockCategoryDB.json"));
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

app.get("/category/:skillCat", validateCatParam, async (req, res) => {
  var username = getUsername(req);
  var authenticated = isAuthenticated(req);
  let skillCat = req.params.skillCat;
  const category = await skillCatCollection.findOne({ name: skillCat });
  const skillObjectArray = category.catSkills;
  const catName = category.name;
  const catImage = category.image;
  /* 
    CB: the await here is the secret sauce!
    https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/project/#std-label-node-fundamentals-project
    */
  let skills = [];

  for await (const skillID of skillObjectArray) {
    let curSkill = await userSkillsCollection.findOne({ _id: skillID });
    skills.push(curSkill);
  }
  res.render("category", {
    authenticated: authenticated,
    username: username,
    db: skills,
    parentPage: "/skill",
    catName: catName,
    catImage: catImage,
  });
  return;
});

app.get("/skill/:skill", validateSkillParam, async (req, res) => {
  var username = getUsername(req);
  var authenticated = isAuthenticated(req);
  //   console.log(req);
  let skill = req.params.skill;
  let referrer = req.get("referrer")
  // console.log(skillCat);
  if (skill == "Chronoscope Repair") {
    app.locals.modalLinks.push({ name: "Zamn!", link: "/zamn" });
  }

  const skilldb = await userSkillsCollection.findOne({ name: skill });

  


  //********BUG HERE ************/
  if (skilldb == null) {
    res.redirect("/404")
  } else { }
  // console.log(category);
  const skillName = skilldb.name;
  const skillImage = skilldb.image;
  const skilledUsers = userCollection.find({
    userSkills: { $in: [skilldb._id] },
  });
  let skilledUsersCache = [];
  for await (const user of skilledUsers) {
    skilledUsersCache.push({
      username: user.username,
      location: user.location,
      userSkills: [], //Dont pass skills in; the user already knows the displayed person has the skills they need //huhh??
      email: user.email,
      userIcon: formatProfileIconPath(user.userIcon),
    });
  }

  // console.log(skilledUsersCache);

  res.render("skill", {
    authenticated: authenticated,
    username: username,
    db: skilledUsersCache,
    skillName: skillName,
    skillImage: skillImage,
    referrer:referrer,
  });
  return;
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
    console.error(emailValidationResult.error);
    res.redirect("/login");
    return;
  }

  const result = await userCollection.find({ email: email }).toArray();
  if (result.length != 1) {
    res.redirect("/loginInvalid");
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    const user = result[0];
    createSession(
      req,
      user.username,
      user.email,
      user.isAdmin,
      user.userIcon,
      user.history
    );
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
  //TODO: Add JOI validation for the request.query.id; a user could manually enter this into the nav bar so its possible for it to be a database attack.

  let username, email, userIcon, user;
  let skills = [];
  let location = "spam";
  let queryID = req.query.id;
  let referrer = req.get("referrer")

  if (req.session.user && queryID == undefined) {
    queryID = req.session.user.username;
    // user = getUser(req);
    // username = getUsername(req);
    // email = getEmail(req);
    // userIcon = getUserIcon(req);
  }
  user = await userCollection.findOne({ username: queryID });
  //if we cant find the requested profile, get the current users profile
  if (!user) {
    // Should never occur, since we have to validate the session first, but just in case this does happen, redirect to 404 :)
    console.error(`Could not find profile page for ${queryID}!`);
    res.redirect("/noUser");
    return;
  }
  username = user.username;
  email = user.email;
  userIcon = user.userIcon;
  location = user.location;

  if (user.userSkills != undefined && user.userSkills.length > 0) {
    let userSkills = userSkillsCollection.find({
      _id: { $in: user.userSkills },
    });
    for await (const skill of userSkills) {
      skills.push(skill);
    }
  }

  res.render("profile", {
    userCard: new userCard(username, location, skills, email, userIcon),
    uploaded: req.query.success,
    referrer: referrer,
  });
});

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
 * History Page.
 */
app.get("/history/:filter", async (req, res) => {
  const filter = req.params.filter;

  let users = [];

  //Check current user.
  let currentUser = getUser(req);

  if (!currentUser) {
    return res.redirect("/");
  }

  currentUser = await userCollection.findOne({
    username: getUsername(req),
  });

  // console.log(currentUser.history.visited);

  const data = userCollection.find({
    _id: { $in: currentUser.history[filter] },
  });

  for await (const user of data) {
    skillNames = userSkillsCollection.find({ _id: { $in: user.userSkills } });
    let userSkills = [];
    for await (const skill of skillNames) {
      userSkills.push(skill.name);
    }
    users.push(
      new userCard(user.username, null, userSkills, user.email, user.userIcon)
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

    // Redirect to a page indicating that the email has been sent
    res.render("passwordResetSent", { email });
  } catch (error) {
    console.error("Error initiating password reset:", error);
    // Handle errors
    res.redirect("/passwordReset");
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
        resetTokenTimestamp: "",
      },
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
    await userCollection.insertOne({
      username: username,
      email: email,
      password: hashedPassword,
      isAdmin: false,
      userIcon: "imgs/profileIconLoggedOut.png"
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

app.get("/zamn", (req, res) => {
  req.session.zamn = !req.session.zamn;
  app.locals.zamn = req.session.zamn;
  console.warn("ZAMN?", req.session.zamn);
  res.redirect("back");
});

app.get("/settings", (req, res) => {
  res.render("settings")
});

app.get("/legal", (req, res) => {
  res.render("legal")
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
  console.info("Node application listening on port " + port);
});
