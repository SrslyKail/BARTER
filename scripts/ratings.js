const ObjectId = require("./modules/databaseConnection").ObjectId;
const Joi = require("joi");

async function addRatingRoute(req, res) {
  let rateStatus;
  let refString = req.get("referrer");
  // console.log("referred:", refString);

  //This is kinda gross but it works
  // console.log(refString);
  let textArray = refString.split("=");
  let profID = textArray[1];
  let value = Number(req.body.rating);

  let ratingUser = ObjectId.createFromHexString(getUserId(req));

  let ratedUser = await userCollection.findOne({ username: profID });
  if (validateRating(ratedUser._id, ratingUser, value)) {
    await addRating(ratedUser._id, ratingUser, value);
    rateStatus = 201;
  } else {
    rateStatus = 409;
  }

  res.redirect(rateStatus, "back");
}

async function validateRating(ratedUser, ratingUser, rateValue) {
  if (
    Joi.number().min(1).max(5).required().validate(rateValue) == null &&
    (await ratingsCollection.findOne({
      userID: ratingUser,
      ratedID: ratedUser,
    })) == null
  ) {
    return true;
  }
  return false;
}

/**
 *
 * @param {ObjectId} ratedUser
 * @param {ObjectId} ratingUser
 * @param {Number} rateValue
 */
async function addRating(ratedUser, ratingUser, rateValue) {
  // console.log("1 " + ratingUser)
  // console.log("2 " + ratedUser)
  let rate = {
    userID: ratingUser,
    ratedID: ratedUser,
    rateValue: rateValue,
    date: new Date(),
  };

  await ratingsCollection.insertOne(rate);

  // console.log(ratedID)

  await userCollection.findOneAndUpdate(
    { _id: ratedUser },
    {
      $inc: { rateCount: 1, rateValue: rateValue },
    }
  );
}

module.exports = { addRatingRoute };
