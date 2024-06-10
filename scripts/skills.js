const { valid } = require("joi");

const objIdSchema = require("./modules/validationSchemas").objectIdSchema;
const ObjectId = require("./modules/databaseConnection").ObjectId;
const getUserId = require("./modules/localSession").getUserId;
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

module.exports = { removeSkill, addSkill };
