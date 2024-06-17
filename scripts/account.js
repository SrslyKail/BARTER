const { databases } = require("./modules/databaseConnection");
const userCollection = databases.userCollection;
const schemas = require("./modules/validationSchemas");
const { createSession } = require("./modules/localSession");

const saltRounds = 12;

async function createNewUser(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  let geo = {
    longitude: Number(req.body.long),
    latitude: Number(req.body.lat),
  };
  var errors = [];

  const validationResult = schemas.userSchema.validate({
    username,
    password,
    email,
  });
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
}

function login(req, res) {
  res.render("login");
}

/**
 * Uses Joi to validate authentication.
 * Compares the entered password with the bcrypted password in database for authentication.
 *
 * Once successfully logged in, redirects to the main.ejs page.
 * @param {Request} req
 * @param {Response} res
 */
async function validateLogin(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  const passwordValidation = schemas.passwordSchema.validate(password);
  const emailValidation = schemas.emailSchema.validate(email);

  if (emailValidation.error != null) {
    res.render("/login", { message: "Invalid email address entered." });
    return;
  }
  if (passwordValidation.error != null) {
    res.render("/login", { message: "Invalid password entered." });
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
    res.render("/login", { message: "Invalid email/password combination." });
    return;
  }
}

module.exports = { create: createNewUser, login, validateLogin };
