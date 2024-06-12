require("dotenv").config();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const MongoClient = require("mongodb").MongoClient;
const MongoStore = require("connect-mongo");
const { Collection, ObjectId } = require("mongodb");

const database = getMongoClient();

const databases = {
  userCollection: getCollection("users"),
  skillCatCollection: getCollection("skillCats"),
  userSkillsCollection: getCollection("skills"),
  ratingsCollection: getCollection("ratings"),
  /**
   * Gets all users with the requested skill from the userCollection
   * @param {ObjectId} skillId The ObjectId of the skill you want to find
   * @returns {Document[] | null} An array fo documents for each user found with the requested skill, or null if no users were found.
   */
  getUsersWithSkill: async (skillId) => {
    const skilledUsers = await databases.userCollection
      .find({
        userSkills: { $in: [skillId] },
      })
      .toArray();
    return skilledUsers;
  },
  /**
   * Gets all skills within a category
   * @param {ObjectId[]} skillIds an array of all the skillIds you want to find
   * @returns {Document[] | null} an array of documents for each found skill, if any, or null if none were found.
   */
  getSkillsInCat: async (skillIds) => {
    let skills = await databases.userSkillsCollection
      .find({ _id: { $in: skillIds } })
      .toArray();
    return skills;
  },
};

/**
 * Creates a mongoclient based on the information in the .env file
 * @returns {MongoClient}
 */
function getMongoClient() {
  const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true`;
  return new MongoClient(atlasURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

function getMongoStore() {
  /* creates a mondodb store for session data*/
  return MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
      secret: mongodb_session_secret,
    },
  });
}

/**
 * Returns the requested collection from the MongoDB specified in .env
 * @param {Collection} collection
 */
function getCollection(collection) {
  return database.db(mongodb_database).collection(collection);
}

/*
  CB: Hiding this code here so we can use it when/if we need to bulk update stuff again for some reason. Uncomment the last line if you need to run it.
*/
async function bulkUpdate(req, res) {
  //The users you want to edit
  const filter = { userSkills: { $eq: null } };
  //How you want to edit them
  const updateDoc = {
    $set: { userSkills: [] },
  };
  //await userCollection.updateMany(filter, updateDoc);
}

module.exports = { getMongoStore, getCollection, ObjectId, databases };
