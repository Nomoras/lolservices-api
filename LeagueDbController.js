// File to deal with the database manipulation
var lol = require('./LeagueApi');

// Constants
const SEASON_START_TIME = 1481068800000;
const VALID_QUEUES = [];
const SOLO_QUEUE = [];

const COL_SUMMONERS = "summoners";

var db;

function initMongo(connection) {
  db = connection;
}

// Adds a new summoner into the database, and fulfills initial stats
function addSummoner(name) {
  // Lookup summoner name and information
  return lol.getSummonerByName(name).then(function (summonerJson) {
    // parse json and add to database if summoner is not already added
    var summoner = JSON.parse(summonerJson)[name.toLowerCase()];

    var summonerCollection = db.collection(COL_SUMMONERS);
    return summonerCollection.findOne({"id" : summoner.id}).then(function (res) {
      // Insert if doesn't already exist
      if (res == null) {
        return summonerCollection.insertOne(summoner).then(function () {
          return "Summoner added!";
        });
      } else {
        //console.log(res);
        return "Summoner already exists!";
      }
    });
  });
}

// Handles summoner deletion
function deleteSummoner(name) {
  // Lookup id
  return lol.getSummonerByName(name).then(function (summonerJson) {
    var summoner = JSON.parse(summonerJson)[name.toLowerCase()];

    return db.collection(COL_SUMMONERS).deleteOne({"id" : summoner.id}).then(function (res) {
      if(res.result.n === 1) {
        return "Successfully deleted " + name;
      } else {
        return "Nothing deleted. Summoner does not exist?";
      };
    });
  });
}

// Adds/updates the summoner's match list to the database
function getSummonerMatchList(summonerId) {
  var queryOptions = {
    beginTime: 1485357745000 // or summoner last updated time
  };
  return true;
}

// Export functions
module.exports.initDbConnection = initMongo;
module.exports.deleteSummoner = deleteSummoner;
module.exports.addSummoner = addSummoner;
