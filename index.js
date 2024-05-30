/** main entry point of the application. */

/* #region requiredModules */
require("./utils.js");
require("dotenv").config();
const express = require("express");

const app = express();

const session = require("express-session");
const bcrypt = require("bcrypt");
const Collection = require("mongodb").Collection;

const crypto = require("crypto");
const fs = require("fs");
const Joi = require("joi");

/* #endregion requiredModules */
/* #region userImports */
const saltRounds = 12;

const port = process.env.PORT || 4000;

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
  getUserId,
  refreshCookieTime,
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
/** @type {Collection} */
const ratingsCollection = getCollection("ratings");

const log = require("./scripts/modules/logging").log;
const sendPasswordResetEmail =
  require("./scripts/modules/mailer").sendPasswordResetEmail;

const {
  upload,
  handleProfileChanges,
  updatePortfolio,
} = require("./scripts/imgUpload.js");
const { FindCursor, ChangeStream } = require("mongodb");

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

/** All the arguments the userCard needs */
class userCard {
  constructor(
    username,
    userSkills,
    email,
    userIcon,
    userLocation = null,
    rateValue = null,
    rateCount = null
  ) {
    this.username = username;
    this.userSkills = userSkills;
    this.email = email;
    this.userIcon = formatProfileIconPath(userIcon);
    this.userLocation = userLocation;
    // console.log("Creating userCard class for", username);
    // console.log("passed ratevalue", rateValue);
    // console.log("passed ratecount", rateCount);
    this.rateValue = rateValue;
    this.rateCount = rateCount;
  }
}

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
  // console.log(req);
  let skill = req.params.skill;
  let referrer = req.get("referrer");
  // console.log(skillCat);
  if (skill == "Chronoscope Repair") {
    app.locals.modalLinks.push({ name: "Zamn!", link: "/zamn" });
  }

  const skilldb = await userSkillsCollection.findOne({ name: skill });

  //********BUG HERE ************/
  if (skilldb == null) {
    res.redirect("/404");
  } else {
  }
  // console.log(category);
  const skillName = skilldb.name;
  const skillImage = skilldb.image;
  const skilledUsers = userCollection.find({
    userSkills: { $in: [skilldb._id] },
  });
  let skilledUsersCache = [];
  for await (const user of skilledUsers) {
    skilledUsersCache.push(
      new userCard(
        user.username,
        [], // CB: Dont pass skills in; the user already knows the displayed person has the skills they need //huhh?? // CB: If we're on the "Baking" page, I know the user has baking. We could display more skills, but it'd require another round of fetching and parsing :')
        user.email,
        user.userIcon,
        user.userLocation,
        typeof user.rateValue !== "undefined" ? user.rateValue : null,
        typeof user.rateCount !== "undefined" ? user.rateCount : null
      )
    );
  }

  // console.log(skilledUsersCache);

  res.render("skill", {
    authenticated: authenticated,
    db: skilledUsersCache,
    skillName: skillName,
    skillImage: skillImage,
    referrer: referrer,
  });
  // console.log("Serverside skill image:", skillImage);
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
      user._id,
      user.history,
      user.isAdmin,
      user.userIcon
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
  let queryID = req.query.id;
  let referrer = req.get("referrer");

  if (referrer == undefined) {
    referrer = "/";
  }

  if (req.session.user && queryID == undefined) {
    res.redirect(`/profile?id=${getUsername(req)}`);
    queryID = req.session.user.username;
    // user = getUser(req);
    // username = getUsername(req);
    // email = getEmail(req);
    // userIcon = getUserIcon(req);
  }
  user = await userCollection.findOne({ username: queryID });
  //user = await userCollection.findOne({ username: "Paul" });

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
  location = user.userLocation;

  if (user.userSkills != undefined && user.userSkills.length > 0) {
    let userSkills = userSkillsCollection.find({
      _id: { $in: user.userSkills },
    });
    for await (const skill of userSkills) {
      skills.push(skill);
    }
  }

  let ratedBefore = await ratingsCollection.findOne({
    userID: ObjectId.createFromHexString(getUserId(req)),
    ratedID: user._id,
  });
  let args = {
    userCard: new userCard(
      username,
      skills,
      email,
      userIcon,
      location,
      user.rateValue,
      user.rateCount
    ),
    uploaded: req.query.success,
    portfolio: user.portfolio,
    formatProfileIconPath: formatProfileIconPath,
    referrer: referrer,
    ratedBefore: ratedBefore,
  };
  // if (user.rateCount) {
  //   args["rateCount"] = user.rateCount;
  //   args["rateValue"] = user.rateValue;
  // }

  res.render("profile", args);
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

app.post(
  "/editProfile/upload",
  upload.single("userIcon"),
  handleProfileChanges
);

/**
 *
 * @param {ObjectId} ratedID
 * @param {ObjectId} userID
 * @param {Number} rateValue
 */
async function addRating(ratedID, userID, rateValue) {
  let ratingUser = userID;
  // console.log("1 " + ratingUser)
  let ratedUser = ratedID;
  // console.log("2 " + ratedUser)

  let ratedBefore = await ratingsCollection.findOne({
    userID: ratingUser,
    ratedID: ratedUser,
  });

  if (ratedBefore == null) {
    let rate = {
      userID: userID,
      ratedID: ratedID,
      rateValue: rateValue,
      date: new Date(),
    };

    await ratingsCollection.insertOne(rate);

    // console.log(ratedID)

    await userCollection.findOneAndUpdate(
      { _id: ratedID },
      {
        $inc: { rateCount: 1, rateValue: rateValue },
      }
    );
    return 201;
  } else {
    // console.log(ratedBefore.rateValue)

    let changeValue = rateValue - ratedBefore.rateValue;
    // console.log(changeValue)
    // console.log(ratedID)
    //This should update the current rating, mongo says "Update document requires atomic operators", which I'm too tired to fix"
    // if (changeValue != 0) {

    //   await userCollection.findOneAndUpdate(
    //     { "_id": ratedID },
    //     {
    //       $inc: { rateValue: changeValue },
    //     }
    //   );

    //   await ratingsCollection.findOneAndUpdate(
    //     { "_id": ratedBefore._id },
    //     {
    //       rateValue: rateValue,
    //       date: new Date(),
    //     }
    //   )
    // }

    // console.log("it's working");
    return 409;
  }
}

/**Post to submit rating from profile. */
app.post("/submit-rating", checkAuth, async (req, res) => {
  let refString = req.get("referrer");
  // console.log("referred:", refString);

  //This is kinda gross but it works
  // console.log(refString);
  let textArray = refString.split("=");
  let profID = textArray[1];
  let value = Number(req.body.rating);
  let ratingUser = new ObjectId(getUserId(req));

  let ratedUser = await userCollection.findOne({ username: profID });
  let ratedObj = ratedUser._id;

  Joi.number().min(1).max(5).required().validate(value);

  rateStatus = await addRating(ratedObj, ratingUser, value);

  res.redirect(rateStatus, "back");
});

/**
 *
 * @param {ObjectId} ratedID
 * @param {ObjectId} userID
 * @param {Number} rateValue
 */
async function addRating(ratedID, userID, rateValue) {
  let ratingUser = userID;
  // console.log("1 " + ratingUser)
  let ratedUser = ratedID;
  // console.log("2 " + ratedUser)

  let ratedBefore = await ratingsCollection.findOne({
    userID: ratingUser,
    ratedID: ratedUser,
  });

  if (ratedBefore == null) {
    let rate = {
      userID: userID,
      ratedID: ratedID,
      rateValue: rateValue,
      date: new Date(),
    };

    await ratingsCollection.insertOne(rate);

    // console.log(ratedID)

    await userCollection.findOneAndUpdate(
      { _id: ratedID },
      {
        $inc: { rateCount: 1, rateValue: rateValue },
      }
    );
    return 201;
  } else {
    // console.log(ratedBefore.rateValue)

    let changeValue = rateValue - ratedBefore.rateValue;
    // console.log(changeValue)
    // console.log(ratedID)
    //This should update the current rating, mongo says "Update document requires atomic operators", which I'm too tired to fix"
    // if (changeValue != 0) {

    //   await userCollection.findOneAndUpdate(
    //     { "_id": ratedID },
    //     {
    //       $inc: { rateValue: changeValue },
    //     }
    //   );

    //   await ratingsCollection.findOneAndUpdate(
    //     { "_id": ratedBefore._id },
    //     {
    //       rateValue: rateValue,
    //       date: new Date(),
    //     }
    //   )
    // }

    // console.log("it's working");
    return 409;
  }
}

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
      //title is a string thats the _id of a related skill; we should update it to just be an ObjectId at some point.
      if (userData.portfolio[i].title === skillData._id.toString()) {
        gallery = userData.portfolio[i].images;
        description = userData.portfolio[i].description;
      }
    }
  }

  return {
    title: skill,
    images: gallery,
    banner: gallery[0] ? gallery[0] : skillData.image,
    description: description,
    username: username,
    currentUser: getUsername(req),
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

/**
 * Edit Portfolio Page.
 */
app.get("/editPortfolio", async (req, res) => {
  const username = req.query.username;
  const skill = req.query.skill;
  let gallery = [];
  let description = "";

  if (!username) {
    res.redirect("/profile");
    return;
  }

  if (!skill) {
    res.redirect("/profile");
    return;
  }

  const userData = await userCollection.findOne({
    username: username,
  });

  const skillData = await userSkillsCollection.findOne({
    name: skill,
  });

  for (let i = 0; i < userData.portfolio.length; i++) {
    if (userData.portfolio[i].title === skillData._id.toString()) {
      gallery = userData.portfolio[i].images;
      description = userData.portfolio[i].description;
    }
  }

  res.render("editPortfolio", {
    title: skill,
    description: description,
    images: gallery,
    username: username,
  });
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
