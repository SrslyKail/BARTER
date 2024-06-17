const { userCollection } = require("./modules/databaseConnection").databases;
const { sendPasswordResetEmail } = require("./modules/mailer");
const { passwordSchema } = require("./modules/validationSchemas");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

function requestReset(req, res) {
  res.render("passwordReset", {});
}

async function reset(req, res) {
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
}

async function sendResetEmail(req, res) {
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
    await sendPasswordResetEmail(email, token);
    result = `A password reset link has been sent to your email.<br><br> Please follow the instructions in the email to change your password.`;
  } catch (error) {
    result = `unexpected error:\n ${error}`;
    console.error("Error initiating password reset:", error);
  }
  // Redirect to a page indicating that the email has been sent
  res.render("passwordReset", { result: result });
}

function change(req, res) {
  res.redirect("reset");
}

async function update(req, res) {
  let password = req.body.password;
  let confirmPassword = req.body.confirmPassword;

  // Check if reset token is valid
  const resetToken = req.body.resetToken; // Assuming resetToken is submitted along with the password change request
  const user = await userCollection.findOne({ resetToken: resetToken });

  const passwordValidationResult = passwordSchema.validate(password);
  const confirmValidationResult = passwordSchema.validate(confirmPassword);

  if (
    !user ||
    password != confirmPassword ||
    passwordValidationResult.error != null ||
    confirmValidationResult.error != null
  ) {
    let result;
    if (!user) {
      result = "Could not find user profile!";
    } else if (password != confirmPassword) {
      result = "Entered password did not match";
    } else if (
      passwordValidationResult.error != null ||
      confirmValidationResult.error != null
    ) {
      result = "Encountered password validation error.";
    }
    res.render(`passwordReset`, { result: result });
    return;
  }

  // If reset token is valid, hash the new password
  var newPassword = await bcrypt.hash(password, saltRounds);

  await userCollection.findOneAndUpdate(
    { email: req.session.resetEmail },
    {
      $set: { password: newPassword },
      $unset: {
        resetToken: null,
        resetTokenTimestamp: null,
      },
    }
  );

  res.render("/login", { message: "Password has been changed." });
}

module.exports = {
  requestReset,
  reset,
  sendResetEmail,
  change,
  update,
};
