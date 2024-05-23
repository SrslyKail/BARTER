const expireTime = 1 * 60 * 60 * 1000; //expires after 1 HOUR

/**
 * A class designed to standardize passing user information to the ejs pages
 */
class User {
    /**
     * @param {Boolean} authenticated
     * @param {Boolean} admin
     * @param {String} username
     * @param {email} email
     */
    constructor(authenticated, admin, username, email) {
        /** @type {boolean} */
        this.isAuthenticated = authenticated;
        /** @type {boolean} */
        this.isAdmin = admin;
        /** @type {string} */
        this.username = username;
        /** @type {string} */
        this.email = email;
    }
}

/**
 * Sets the privileges, username, and expiration date for the session
 * @param {Request} The request to attach the session to
 * @param {String} username The username of this user.
 * @param {Boolean} admin If the user is an admin. Defaults to false.
 */
function createSession(req, username, admin = false, email) {
    req.session.cookie.maxAge = expireTime;
    let user = new User(true, admin, username, email);
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

function getEmail(req) {
    let user = req.session.user;
    return user ? user.email : null;
}

module.exports = {
    User,
    createSession,
    isAuthenticated,
    isAdmin,
    getUsername,
    getUser,
    getEmail
};
