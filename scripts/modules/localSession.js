const { ObjectId } = require("mongodb");

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 HOUR
const defaultIcon = "imgs/profileIconLoggedOut.png";
const cloudinaryString = "https://res.cloudinary.com/dxttfq7qd/image/upload/";
/**
 * A class designed to standardize passing user information to the ejs pages
 */
class User {
  /**
   * @param {Boolean} authenticated
   * @param {Boolean} admin
   * @param {String} username
   * @param {String} email
   * @param {URL | String} userIcon
   * @param {ObjectId} userId
   */
  constructor(
    authenticated,
    admin,
    username,
    email,
    userIcon = defaultIcon,
    userId
  ) {
    /** @type {Boolean} */
    this.isAuthenticated = authenticated;
    /** @type {Boolean} */
    this.isAdmin = admin;
    /** @type {String} */
    this.username = username;
    /** @type {String} */
    this.email = email;
    /** @type {String | URL} */
    this.userIcon = formatProfileIconPath(userIcon);
    /** @type {ObjectId} */
    this.userId = userId;
  }
}

/**
 * Sets the privileges, username, and expiration date for the session
 * @param {Request} req The request to attach the session to
 * @param {String} username The username of this user.
 * @param {String} email The email address of this use.
 * @param {ObjectId} userId
 * @param {Boolean} admin If the user is an admin. Defaults to false.
 * @param {URL | String} userIcon the path to the user icon.
 */
function createSession(
  req,
  username,
  email,
  userId,
  admin = false,
  userIcon = defaultIcon
) {
  req.session.cookie.maxAge = expireTime;
  let user = new User(true, admin, username, email, userIcon, userId);
  req.session.user = user;
}

/**
 *
 * @param {Request} req
 * @returns {Boolean}
 */
function isAuthenticated(req) {
  let user = getUser(req);
  //ternary ensures we always get a boolean output
  //otherwise we might return null
  return user ? user.isAuthenticated : false;
}

/**
 *
 * @param {Request} req
 * @returns {Boolean}
 */
function isAdmin(req) {
  let user = getUser(req);
  //ternary ensures we always get a boolean output
  //otherwise we might return null
  return user ? user.isAdmin : false;
}

/**
 *
 * @param {Request} req
 * @returns {String | null}
 */
function getUsername(req) {
  let user = getUser(req);
  return user ? user.username : user;
}

/**
 *
 * @param {Request} req
 * @returns {URL | String}
 */
function getUserIcon(req) {
  let user = getUser(req);
  let icon = user ? user.userIcon : defaultIcon;
  return formatProfileIconPath(icon);
}

/**
 *
 * @param {Request} req
 * @returns {ObjectId | null}
 */
function getUserId(req) {
  let user = getUser(req);
  return user ? user.userId : null;
}

/**
 *
 * @param {Request} req
 * @returns {URL | String}
 */
function getUser(req) {
  let user = req.session.user;
  return user ? user : null;
}

function getEmail(req) {
  let user = req.session.user;
  return user ? user.email : null;
}

/**
 * Checks if a file is the default icon or not, and formats it appropriately
 * @param {URL | String} path
 * @returns {URL | String}
 */
function formatProfileIconPath(path) {
  if (path == defaultIcon || path == null || path == undefined) {
    return "/" + path;
  } else if (path.includes(cloudinaryString)) {
    return path;
  } else {
    return cloudinaryString + path;
  }
}

module.exports = {
  User,
  createSession,
  isAuthenticated,
  isAdmin,
  getUsername,
  getUser,
  getEmail,
  getUserIcon,
  getUserId,
  defaultIcon,
  formatProfileIconPath,
};
