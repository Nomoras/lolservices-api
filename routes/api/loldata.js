// Endpoint for league data
var lolData = require('../../league/LolData');
var lolDb = require("../../league/LeagueDbController")
var lol = require('../../league/LeagueApi');
var _ = require("lodash");

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
  res.send(lol.getStaticData("realms").then((response) => JSON.parse(response)));
}

// Generates a map for champion name to id
function getChampionMaps(req, res) {
  res.send(lol.getStaticData("champions").then((response) => {
    var championList = JSON.parse(response).data;

    // Generate both maps serverside to reduce client overhead
    var championToId = {};
    var idToChampion = {};

    _.forEach(championList, (entry) => {
      championToId[entry.name] = entry.id;
      idToChampion[entry.id] = entry.name;
    });

    return {
      "championToId" : championToId,
      "idToChampion" : idToChampion
    }
  }));
}

function getLastUpdated(req, res) {
  res.send({"time" : lolDb.getLastUpdatedTime()});
}

function clearCache(req, res) {
  lol.clearCache();
  res.send("Cache cleared");
}

module.exports = {
  "getRoleList" : getRoleList,
  "getRankScore" : getRankScore,
  "getDataDragonConfig" : getDataDragonConfig,
  "getChampionMaps" : getChampionMaps,
  "getLastUpdated" : getLastUpdated,
  "clearCache" : clearCache
}
