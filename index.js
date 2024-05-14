/** main entry point of the application. */

/** required modules import */
require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 4000;

const app = express();

const Joi = require("joi");

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 HOUR

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* end secret section */

var {database} = include('databaseConnection');

/**
 * sets the view engine to ejs, configures the express app, 
 * and sets up the middleware for parsing url-encoded data.
 */
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: false})); 

/** creates a mondodb store for session data*/
var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
})

/** middleware, handles session management */
app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));
app.use(express.static(__dirname + "/public"));

/**
 * handles all routes that are not matched by any other route.
 * renders a 404 page and sets the response status to 404.
 */
app.get("*", (req,res) => {
	res.status(404);
	res.render("404");
})

/** starts the server and listens on the specified port */
app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 
