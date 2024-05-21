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
 * @param {Request} The request to attach the session to
 * @param {String} username The username of this user.
 * @param {Boolean} admin If the user is an admin. Defaults to false.
 */
function createSession(req, username, admin = false) {
  req.session.cookie.maxAge = expireTime;
  let user = new User(true, admin, username);
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
 * @returns {User | null}
 */
function getUser(req) {
  let user = req.session.user;
  return user ? user : null;
}

module.exports = {
  User,
  createSession,
  isAuthenticated,
  isAdmin,
  getUsername,
  getUser,
};
