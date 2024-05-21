require("dotenv").config();
const nodemailer = require("nodemailer");

const nodemailer_user = process.env.NODEMAILER_USER;
const nodemailer_password = process.env.NODEMAILER_PASSWORD;

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
    from: "barter.bby14@gmail.com",
    to: email,
    subject: "Password Reset",
    text:
      `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
      `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
      `http://localhost:${port}/passwordReset/${token}\n\n` +
      `The link will expire in 5 minutes\n\n` +
      `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent");
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
}

module.exports = { sendPasswordResetEmail };
