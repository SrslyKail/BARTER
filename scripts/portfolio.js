const cloudinaryHelper = require("./modules/cloudinaryHelper");

async function updatePortfolio(req, res) {
  const skill = req.query.skill;
  let description = req.body.description;

  let currentSkill = userSkillsCollection.findOne({ name: skill });
  let currentUser = userCollection.findOne({
    username: getUsername(req),
  });
  let image = null;

  if (req.file) {
    image = cloudinaryHelper.upload(req.file.path);
  }

  [currentUser, currentSkill, image] = await Promise.all([
    currentUser,
    currentSkill,
    image,
  ]);

  if (req.file && image == null) {
    return cloudinaryHelper.errorPage(res);
  }

  let index = 0;
  let found = false;

  //if the user has a portfolio, we need to find the right one
  let userKeys = Object.keys(currentUser);
  if (userKeys.includes("portfolio") && currentUser.portfolio.length) {
    currentUser.portfolio.forEach((obj, ind) => {
      //TODO: CB: Fix the fact that title is a string. This will drive me nuts.
      if (obj.title == currentSkill._id.toString()) {
        index = ind;
        found = true;
      }
    });
  }

  if (!found) {
    //we push a new array
    await initializePortfolio(currentSkill, description, currentUser);
  }

  //we update with the image and data
  await updatePortfolio(description, image, currentUser, currentSkill);

  res.redirect("/profile?id=" + currentUser.username);
}

async function updatePortfolio(description, image, currentUser, currentSkill) {
  let updates = {
    $set: {
      [`portfolio.$.description`]: description,
    },
  };
  if (image) {
    updates["$push"] = { "portfolio.$.images": image };
  }
  await userCollection.updateOne(
    {
      username: currentUser.username,
      "portfolio.title": currentSkill._id.toString(),
    },
    updates
  );
}

async function initializePortfolio(currentSkill, description, currentUser) {
  let updates = {
    $push: {
      portfolio: {
        title: currentSkill._id.toString(),
        images: [],
        description: description,
      },
    },
  };

  await userCollection.updateOne(
    {
      username: currentUser.username,
    },
    updates
  );
}

async function editPortfolio(req, res) {
  if (req.query.id != getUsername(req) || !req.query.skill) {
    res.redirect("/profile");
  } else {
    data = await setupPortfolio(req, res);
    // console.log(data);
    res.render("editPortfolio", data);
  }
}

async function setupPortfolio(req, res) {
  const skill = req.query.skill;
  const username = req.query.id;
  let referrer = req.get("referrer");
  if (referrer == undefined) {
    referrer = "/";
  }

  let gallery = [];
  let description = "";

  let skillData = userSkillsCollection.findOne({
    name: skill,
  });

  let userData = userCollection.findOne({
    username: username,
  });

  [skillData, userData] = await Promise.all([skillData, userData]).catch(
    (err) => {
      res.render("404");
      return null;
    }
  );

  if (Object.keys(userData).includes("portfolio")) {
    userData.portfolio.forEach((item, i) => {
      //TODO: CB: item.title is a string thats the _id of a related skill; we should update it to just be an ObjectId at some point.
      if (item.title === skill._id.toString()) {
        gallery = userData.portfolio[i].images;
        description = userData.portfolio[i].description;
      }
    });
  }

  return {
    title: skill,
    images: gallery,
    banner: skillData.image,
    description: description,
    username: username,
    currentUser: getUsername(req),
    referrer: referrer,
  };
}

module.exports = {
  edit: editPortfolio,
  update: updatePortfolio,
};
