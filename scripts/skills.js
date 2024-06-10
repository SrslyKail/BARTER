const objIdSchema = require("./modules/validationSchemas").objectIdSchema;
const ObjectId = require("./modules/databaseConnection").ObjectId;
const { getUsername, getUserId } = require("./modules/localSession");
const userCard = require("./modules/userCard").userCard;
const { skillCatCollection, userSkillsCollection, userCollection } =
  require("./modules/databaseConnection").databases;

/**
 * Removes a skill from the users profile in Mongo
 * @param {Request} req
 * @param {Response} res
 */
async function removeSkill(req, res) {
  let userId = getUserId(req);
  let skillId = req.params.skillID;
  let validationResults = validateUserAndSkillIds(userId, skillId);

  if (validationResults.length != 0) {
    validationResults.forEach((result) => {
      errors.push(result);
    });
    //! CB: Unsure why this reroutes to /
    // also unsure what errors is meant to do be doing here, or where its initialized.
    res.redirect("/");
  } else {
    rateStatus = await removeSkillFromUser(
      ObjectId.createFromHexString(userId),
      ObjectId.createFromHexString(skillId)
    );
    res.redirect("back");
  }
}

/**
 *
 * @param {String} userId a hex string
 * @param {String} skillId a hex string
 * @returns {Array} errors An array containing all found errors; empty if none were found
 */
function validateUserAndSkillIds(userId, skillId) {
  let userValidation = objIdSchema.validate({ userId });
  let skillValidation = objIdSchema.validate({ skillId });

  let errors = [][(userValidation, skillValidation)].forEach((result) => {
    if (result != null) {
      errors.push(validationResult.error.details[0].message);
    }
  });

  return errors;
}

async function addSkill(req, res) {
  let userId = getUserId(req);
  let skillId = req.params.skillID;
  let validationResults = validateUserAndSkillIds(userId, skillId);

  if (validationResults.length != 0) {
    validationResults.forEach((result) => {
      errors.push(result);
    });
    res.redirect("/");
  } else {
    rateStatus = await addSkillToUser(
      ObjectId.createFromHexString(userId),
      ObjectId.createFromHexString(skillId)
    );
    res.redirect("back");
  }
}

/**
 * @param {ObjectId} skillID
 * @param {ObjectId} userID
 */
async function removeSkillFromUser(userID, skillID) {
  await userCollection.updateOne(
    { _id: userID },
    { $pull: { userSkills: skillID } }
  );
}

/**
 * @param {ObjectId} skillID
 * @param {ObjectId} userID
 */
async function addSkillToUser(userID, skillID) {
  await userCollection.updateOne(
    { _id: userID },
    { $addToSet: { userSkills: skillID } }
  );
}

async function loadSkillPage(req, res) {
  if (getUserId(req) != null) {
    var username = getUsername(req);
    // console.log(req);
    let skill = req.params.skill;
    // console.log(skillCat);
    if (skill == "Chronoscope Repair") {
      app.locals.modalLinks.push({ name: "Zamn!", link: "/zamn" });
    }

    const skilldb = await userSkillsCollection.findOne({ name: skill });

    if (skilldb == null) {
      res.redirect("/404");
    } else {
      skilledUsers = getSkilledUsers();
    }
    let skilledUsersCache = await getSkilledUsers(skilldb._id);

    res.render("skill", {
      username: username,
      db: skilledUsersCache,
      skillName: skilldb.name,
      skillImage: skilldb.image,
      skillObjID: skilldb._id,
      referrer: req.get("referrer"),
    });
  } else {
    //CB: Currently we need to redirect to login because an un-logged-in user wont have a username, so it would crash some of the logic on the skills page.
    // We should try to refactor that out at some point.
    res.redirect("../login");
  }
}

async function getSkilledUsers(skillId) {
  const skilledUsers = userCollection.find({
    userSkills: { $in: [skillId] },
  });
  let skilledUsersCache = [];
  for await (const user of skilledUsers) {
    skilledUsersCache.push(
      new userCard(
        user.username,
        [], // CB: Dont pass skills in; the user already knows the displayed person has the skills they need //huhh?? // CB: If we're on the "Baking" page, I know the user has baking. We could display more skills, but it'd require another round of fetching and parsing :')
        user.email,
        user.userIcon,
        user.userLocation,
        typeof user.rateValue !== "undefined" ? user.rateValue : null,
        typeof user.rateCount !== "undefined" ? user.rateCount : null
      )
    );
  }
  return skilledUsersCache;
}

async function loadSkillCat(req, res) {
  var username = getUsername(req);
  const category = await skillCatCollection.findOne({
    name: req.params.skillCat,
  });
  /* 
    CB: the await here is the secret sauce!
    https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/read-operations/project/#std-label-node-fundamentals-project
    */
  let skills = await getSkillsInCat(category.catSkills);
  res.render("category", {
    username: username,
    db: skills,
    parentPage: "/skill",
    catName: category.name,
    catImage: category.image,
  });
  return;
}

async function getSkillsInCat(skillObjectArray) {
  let skills = [];

  for await (const skillID of skillObjectArray) {
    let curSkill = await userSkillsCollection.findOne({ _id: skillID });
    skills.push(curSkill);
  }
  return skills;
}

module.exports = { removeSkill, addSkill, loadSkillPage, loadSkillCat };
