const expireTime = 1 * 60 * 60 * 1000; //expires after 1 HOUR

/**
 * A class designed to standardize passing user information to the ejs pages
 */
class User {
  /**
   * @param {Boolean} authenticated
   * @param {Boolean} admin
   * @param {String} username
   */
  constructor(authenticated, admin, username) {
    /** @type {boolean} */
    this.isAuthenticated = authenticated;
    /** @type {boolean} */
    this.isAdmin = admin;
    /** @type {string} */
    this.username = username;
  }
}

/**
 * Sets the privileges, username, and expiration date for the session
 * @param {Boolean} authenticated The authentication status for this user.
 * @param {String} username The username of this user.
 * @param {Boolean} admin If the user is an admin. Defaults to false.
 */
function createSession(authenticated, username, admin = false) {
  req.session.cookie.maxAge = expireTime;
  req.session.user = new User(authenticated, admin, username);
}

/**
 *
 * @param {Request} req
 * @returns {boolean}
 */
function isAuthenticated(req) {
  //ternary ensures we always get a boolean output
  //otherwise we might return null
  return req.session.user.isAuthenticated ? true : false;
}

/**
 *
 * @param {Request} req
 * @returns {boolean}
 */
function isAdmin(req) {
  //ternary ensures we always get a boolean output
  //otherwise we might return null
  return req.session.user.isAdmin ? true : false;
}

/**
 *
 * @param {Request} req
 * @returns {string}
 */
function getUsername(req) {
  return req.session.user.username;
}

module.exports = {
  User,
  createSession,
  isAuthenticated,
  isAdmin,
  getUsername,
};
