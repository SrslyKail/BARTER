const { formatProfileIconPath } = require("./localSession");

/** All the arguments the userCard needs */
class userCard {
  constructor(
    username,
    userSkills,
    email,
    userIcon,
    userLocation = null,
    rateValue = null,
    rateCount = null
  ) {
    this.username = username;
    this.userSkills = userSkills;
    this.email = email;
    this.userIcon = formatProfileIconPath(userIcon);
    this.userLocation = userLocation;
    this.rateValue = rateValue;
    this.rateCount = rateCount;
  }
}

function createUserCard(mongoDocument) {}

function createUserCard([...mongoDocuments]) {}

module.exports = { userCard };
