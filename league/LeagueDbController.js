// File to deal with the database manipulation
// This file should only contain the async methods that need to interact with either the database or api
var lol = require('./LeagueApi');
var _ = require("lodash");
var config = require('config');
var matchParser = require('./MatchController');
var lolData = require('./LolData.js');

// DB Collection constants
const COL_SUMMONERS = "summoners";
const COL_MATCHES = "matches";

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
    summoner.lastUpdated = lolData.SEASON_START_TIME;

    var summonerCollection = db.collection(COL_SUMMONERS);
    return summonerCollection.findOne({"id" : summoner.id}).then(function (res) {
      // Insert if doesn't already exist
      if (res == null) {
        return summonerCollection.insertOne(summoner).then(function () {
          console.log(name + " being added " + Date.now());
          return addSummonerMatchList(summoner.id);
        });
      } else {
        return "ERROR: Summoner already exists";
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
        console.log(name + " was deleted" + Date.now());
        return "Summoner deleted";
      } else {
        return "ERROR: Summoner does not exist";
      };
    });
  });
}

// Simple read on the summoner on the db. #nofilters.
function getSummoner(name) {
  return lol.getSummonerByName(name).then(function (summonerJson) {
    var summoner = JSON.parse(summonerJson)[name.toLowerCase()];

    return db.collection(COL_SUMMONERS).findOne({"id" : summoner.id}).then(function (res) {
      return (res == null) ? "Summoner does not exist" : res;
    });
  });
}

// Get a summoner based on query options
function getSummonerMatchStats(name, options) {
  // Get the match list from the summoner object in the database, if it exists
  return lol.getSummonerByName(name).then(function (summonerJson) {
    var summ = JSON.parse(summonerJson)[name.toLowerCase()];
    return db.collection(COL_SUMMONERS).findOne({"id" : summ.id}).then((summoner) => {
      if (summoner == null) {
        return "Summoner does not exist"
      }

      var filteredMatches = matchParser.filterMatchList(summoner.matches, options);
      var result = {
        "current" : matchParser.aggregateMatchStats(filteredMatches),
        "peak" : matchParser.aggregateMatchStats(filteredMatches.slice(0, matchParser.getPeakRankMatchIndex(filteredMatches) + 1))
      }

      return result;
    })
  });
}

// Adds/updates the summoner's match list to the database
function addSummonerMatchList(summonerId, startTime, queue) {
  var queryOptions = {
    // TODO: replace start time with SEASON_START_TIME for prod
    beginTime: (startTime == undefined) ? 1489110444000 : startTime
  };

  // Get match list from api
  return lol.getMatchListFromSummoner(summonerId, queryOptions).then(function (matchListJson) {
    var matchList = JSON.parse(matchListJson)["matches"];
    return getMatchModels(matchList, summonerId).then((matchModels) => {
      // Get old match list
      return db.collection(COL_SUMMONERS).find({"id" : summonerId}).project({"matches" : 1, "_id" : 0}).nextObject().then(function (matchResult) {
        var matches = matchResult["matches"];

        if (matches == undefined) {
          matches = [];
        }


        // Append new models
        for (let index = 0; index < matchModels.length; index++) {
          matches.push(matchModels[index]);
        }

        // Update new match list and update summoner last updated time
        var updateOperation = {
          "$set" : {
            "matches" : matches,
            "lastUpdated" : matches[matches.length - 1].timestamp + 1
          }
        }

        return db.collection(COL_SUMMONERS).updateOne({"id" : summonerId}, updateOperation);
      }).then(function (res) {
        return updateMostRecentMatchStats(summonerId);
      });
    }).catch(function (err) {
      console.error(err);
      return err;
    });
  });
}

function updateMostRecentMatchStats(summonerId) {
  // query for the most recent match
  return db.collection(COL_SUMMONERS).find({"id" : summonerId}).project({"matches" : 1, "_id" : 0}).nextObject().then(function (queryResult) {
    var matches = queryResult.matches;
    var updatePromises = [];
    // Update each queue being analyzed
    lolData.RANKED_QUEUES.forEach((queueList) => {
      // Check if most recent match in queue has stats object
      var lastMatchIndex = matchParser.getMostRecentMatchIndex(matches, queueList);

      if (lastMatchIndex >= 0) {
        var lastMatch = matches[lastMatchIndex];
        // check if it already has a stats object
        if (lastMatch.rank == 0) {
          updatePromises.push(getSummonerRank(summonerId, queueList[0]).then((rank) => {
            lastMatch.rank = rank;
            matches[lastMatchIndex] = lastMatch;
            return Promise.resolve();
          }))
        }
      }
    });

    return Promise.all(updatePromises).then(() => {
      var updateOperation = {
        "$set" : {
          "matches" : matches
        }
      }

      return db.collection(COL_SUMMONERS).updateOne({"id" : summonerId}, updateOperation)
    })
  });
}



function updateAllSummoners() {
  // Get all summoner ids from db and call update on each
  return db.collection(COL_SUMMONERS).find().project({"id" : 1, "lastUpdated" : 1, "name" : 1, "_id" : 0}).toArray().then(function (summonerList) {
    var summonerUpdates = [];
    summonerList.forEach((summoner) => {
      console.log("Update queued for " + summoner.name + " at " + Date.now());
      summonerUpdates.push(addSummonerMatchList(summoner.id, summoner.lastUpdated));
      summonerUpdates.push(updateSummonerProfile(summoner.id));
    });
    return Promise.all(summonerUpdates).then(() => {
      console.log("Summoner updates completed at " + Date.now());
      return "Summoners successfully updated";
    });
  }).catch((err) => {
    console.log("Summoner updates failed:");
    console.log(err);
    return "Summoners failed to update" + err;
  });
}

function updateSummonerProfile(summonerId) {
  return lol.getSummonerById(summonerId).then(function (summonerJson) {
    // Update name and profile icon
    var summoner = JSON.parse(summonerJson)[summonerId];

    var updateOperation = {
      "$set" : {
        "profileIconId" : summoner.profileIconId,
        "name" : summoner.name
      }
    }

    return db.collection(COL_SUMMONERS).updateOne({"id" : summonerId}, updateOperation)
  });
}

function getMatchModels(matchList, summonerId) {
  // Check empty match list
  if (matchList == undefined) {
    return Promise.resolve([]);
  }

  // Create arrays
  var matchPromises = [];
  var matchModels = [];

  // Get match objects for each match
  for (let index = 0; index < matchList.length; index++) {
    matchPromises.push(getMatch(matchList[index].matchId));
  }

  return Promise.all(matchPromises).then(function (matches) {
    // Add match objects to database
    for (let index = 0; index < matches.length; index++) {
      matchModels.push(matchParser.createMatchObject(summonerId, matches[index]));
    }

    // Reverse order -- api returns latest first, we want latest last
    matchModels.reverse();
    return matchModels;
  });
}

function getMatch(id) {
  // Gets match from database if its found
  // if not, get it from the api and push it into the database
  return db.collection(COL_MATCHES).findOne({"matchId" : id}).then(function (res) {
    if (res == null) {
      return lol.getMatchFromId(id, {'includeTimeline' : false}).then((match) => {
        var parsedMatch = JSON.parse(match);
        return db.collection(COL_MATCHES).insertOne(parsedMatch).then(() => {
          return parsedMatch;
        })
      });
    } else {
      return Promise.resolve(res);
    }
  });
}

// Gets ranked stat value from player
function getSummonerRank(id, queue) {
  // default queue is QUEUE_TYPE
  queue = (queue === undefined) ? lolData.DEFAULT_QUEUE_TYPE : queue;

  // query for their ranked stats
  return lol.getLeagueInfo(id).then((leaguesJson) => {
    // Get stats for correct queue
    var leagues = JSON.parse(leaguesJson)[id];
    var league = 0;
    for (var i = 0; i < leagues.length; i++) {
      if (leagues[i].queue == queue) {
        league = leagues[i];
      }
    }

    if (league != 0) {
      return ({
        tier : league.tier,
        lp : league.entries[0].leaguePoints,
        division : league.entries[0].division
      });
    } else {
      return 0;
    }
  });
}


// Export functions
module.exports.initDbConnection = initMongo;
module.exports.deleteSummoner = deleteSummoner;
module.exports.addSummoner = addSummoner;
module.exports.updateAllSummoners = updateAllSummoners;
module.exports.getSummoner = getSummoner;
module.exports.getSummonerMatchStats = getSummonerMatchStats;
