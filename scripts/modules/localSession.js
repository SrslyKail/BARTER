const expireTime = 1 * 60 * 60 * 1000; //expires after 1 HOUR
const defaultIcon = "imgs/profileIconLoggedOut.png";
const cloudinaryString = "https://res.cloudinary.com/dxttfq7qd/image/upload/";
const ObjectId = require("mongodb").ObjectId;

/**
 * A class designed to standardize passing user information to the ejs pages
 */
class User {
  /**
   * @param {Boolean} authenticated
   * @param {Boolean} admin
   * @param {String} username
   * @param {String} email
   * @param {ObjectId} userId
   * @param {Array} history
   * @param {URL | String} userIcon
   */
  constructor(
    authenticated,
    admin,
    username,
    email,
    userId,
    history,
    userIcon = defaultIcon
  ) {
    /** @type {Boolean} */
    this.isAuthenticated = authenticated;
    /** @type {Boolean} */
    this.isAdmin = admin;
    /** @type {String} */
    this.username = username;
    /** @type {String} */
    this.email = email;
    /** @type {ObjectId} */
    this.userId = userId;
    /** @type {Array} */
    this.history = history;
    /** @type {URL | String} */
    this.userIcon = formatProfileIconPath(userIcon);
  }
}

/**
 * Sets the privileges, username, and expiration date for the session
 * @param {Request} req The request to attach the session to
 * @param {String} username The username of this user.
 * @param {String} email The email address of this user.
 * @param {ObjectId} userId The ObjectId of the this user
 * @param {Array} history The history of the user.
 * @param {Boolean} admin If the user is an admin. Defaults to false.
 * @param {URL | String} userIcon the path to the user icon.
 */
function createSession(
  req,
  username,
  email,
  userId,
  history = { visited: [], contacted: [] },
  admin = false,
  userIcon = defaultIcon
) {
  req.session.cookie.maxAge = expireTime;
  let user = new User(true, admin, username, email, userId, history, userIcon);
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

function refreshCookieTime(req) {
  req.session.cookie.maxAge = isAuthenticated(req)
    ? (req.session.cookie.maxAge += expireTime - req.session.cookie.maxAge)
    : null;
  req.session.cookie.maxAge > expireTime
    ? (req.session.cookie.maxAge = expireTime)
    : null;
  console.log("after:", req.session.cookie.maxAge);
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
 * @returns {ObjectId | null}
 */
function getHistory(req) {
  let user = getUser(req);
  return user ? new ObjectId(user.history) : null;
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
  path = `${path}`;
  if (path == undefined || path == null || path == defaultIcon) {
    return "/" + defaultIcon;
  } else if (path.includes(defaultIcon)) {
    return path;
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
  getHistory,
  getUserIcon,
  getUserId,
  defaultIcon,
  formatProfileIconPath,
  refreshCookieTime
};
