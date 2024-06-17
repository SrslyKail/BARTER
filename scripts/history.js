const { databases } = require("./modules/databaseConnection");
const { userCollection, userSkillsCollection } = databases;
const {
  getUser,
  getUsername,
  userCard,
  formatProfileIconPath,
} = require("./modules/localSession");

async function filterHistory(req, res) {
  const filter = req.params.filter;

  let users = [];

  //Check current user.
  let currentUser = getUser(req);

  if (!currentUser) {
    res.redirect("/");
    return;
  }

  currentUser = await userCollection.findOne({
    username: getUsername(req),
  });

  const data = await userCollection
    .find({
      _id: { $in: currentUser.history[filter] },
    })
    .toArray();

  let promiseArray = [];

  data.forEach(async (user, index) => {
    promiseArray[index] = userSkillsCollection
      .find({ _id: { $in: user.userSkills } })
      .toArray()
      .then((userSkills) => {
        users.push(
          new userCard(
            user.username,
            userSkills,
            user.email,
            user.userIcon,
            user.userLocation
          )
        );
      });
  });

  await Promise.all(promiseArray);
  res.render("history", {
    data: users,
    filter: filter,
    formatProfileIconPath: formatProfileIconPath,
  });
}

function showHistory(req, res) {
  res.render("history", {});
}

module.exports = {
  filter: filterHistory,
  show: showHistory,
};
