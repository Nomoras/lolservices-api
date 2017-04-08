// Endpoint for league data
var lolData = require('../../league/LolData');
var lol = require('../../league/LeagueApi')

// Get role list
function getRoleList(req, res) {
  res.send(lolData.roleList);
}

// Get rank score given division, tier, and lp
function getRankScore(req, res) {
  // Check if all parameters are given
  if (req.query.division == undefined || req.query.tier == undefined || req.query.lp == undefined) {
    res.status(400).send("Please specify the required parameters: tier, division, lp");
  } else {
    res.send({"score" : lolData.getRankScore(req.query.tier, req.query.division, parseInt(req.query.lp))});
  }
}

function getDataDragonConfig(req, res) {
  res.send(lol.getStaticData("realm"));
}

module.exports = {
  "getRoleList" : getRoleList,
  "getRankScore" : getRankScore,
  "getDataDragonConfig" : getDataDragonConfig
}
