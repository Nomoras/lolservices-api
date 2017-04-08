// File to deal with the database manipulation
var lol = require('./LeagueApi');
var _ = require("lodash");
var config = require('config');

// Ranked Season Constants
const SEASON_START_TIME = config.get("RankedConfig.SEASON_START_TIME");

const RANKED_SOLO = config.get("RankedConfig.RANKED_SOLO");
const RANKED_FLEX = config.get("RankedConfig.RANKED_FLEX");
const DEFAULT_QUEUE_TYPE = config.get("RankedConfig.DEFAULT_QUEUE_TYPE");
const RANKED_QUEUES = [RANKED_SOLO, RANKED_FLEX];

// Role Constants
var ApiRole = {
  TOP : 'TOP',
  JUNGLE : 'NONE',
  MID : 'MID',
  ADC : 'DUO_CARRY',
  SUPPORT : 'DUO_SUPPORT'
}

var Role = {
  TOP : 'top',
  JUNGLE : 'jungle',
  MID : 'mid',
  ADC : 'adc',
  SUPPORT : 'support'
}

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
    summoner.lastUpdated = SEASON_START_TIME;

    var summonerCollection = db.collection(COL_SUMMONERS);
    return summonerCollection.findOne({"id" : summoner.id}).then(function (res) {
      // Insert if doesn't already exist
      if (res == null) {
        return summonerCollection.insertOne(summoner).then(function () {
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

      var filteredMatches = filterMatchList(summoner.matches, options);
      var result = {
        "current" : aggregateMatchStats(filteredMatches),
        "peak" : aggregateMatchStats(filteredMatches.slice(0, getPeakRankMatchIndex(filteredMatches) + 1))
      }

      return result;
    })
  });
}

// Filters the match list. For use with the get summoner query. ... I need to organize all this.
function filterMatchList(matchList, options) {
  var queue = (options.queue == 1) ? RANKED_SOLO : RANKED_FLEX;
  var limit = (options.limit == 0) ? matchList.length : options.limit;
  var reverse = options.reverse;

  // Filter as necessary
  var queueFilteredList = matchList.filter(match => queue.includes(match.queue));
  var championFilteredList = (options.champions.length == 0) ? queueFilteredList : queueFilteredList.filter(match => options.champions.includes(match.champion));
  var roleFilteredList = championFilteredList.filter(match => options.role.includes(match.role));

  var finalList = roleFilteredList;

  // Makes sure limit doesn't go overboard
  if (limit > finalList.length) {
    limit = finalList.length;
  }

  if (reverse) {
    return finalList.slice(finalList.length - limit, finalList.length)
  } else {
    return finalList.slice(0, limit);
  }
}

// Aggregates stats from a match list
function aggregateMatchStats(matchList) {
  if (matchList.length == 0) {
    return {};
  }
  var wins = _.reduce(matchList, function(wins, match) {
    return wins + match.victorious;
  }, 0)

  var result = {
    "wins" : wins,
    "losses" : matchList.length - wins,
    "kills" : _.sumBy(matchList, function(match) { return match.kills}),
    "deaths" : _.sumBy(matchList, function(match) { return match.deaths}),
    "assists" : _.sumBy(matchList, function(match) { return match.assists}),
    "timestamp" : matchList[matchList.length - 1].timestamp,
    "rank" : matchList[matchList.length - 1].rank
  }

  return result;
}

function getPeakRankMatchIndex(matchList) {
  var maxRankScore = 0;
  var maxIndex = matchList.length - 1;

  for (var index = 0; index < matchList.length; index++) {
    if (matchList[index].rank != 0) {
      var currentScore = getRankScore(matchList[index].rank.tier, matchList[index].rank.division, matchList[index].rank.lp);
      if (currentScore > maxRankScore) {
        maxRankScore = currentScore;
        maxIndex = index;
      }
    }
  }

  return maxIndex;
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
    RANKED_QUEUES.forEach((queueList) => {
      // Check if most recent match in queue has stats object
      var lastMatchIndex = getMostRecentMatchIndex(matches, queueList);

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

function getMostRecentMatchIndex(matchList, queueList) {
  // Search match list in reverse order for queue type
  if (matchList.length == undefined || matchList.length == 0) {
    return -1;
  }

  for (var index = matchList.length - 1; index >= 0; index--) {
    if (_.includes(queueList, matchList[index].queue)) {
      return index;
    }
  }

  return -1;
}

function updateAllSummoners() {
  // Get all summoner ids from db and call update on each
  return db.collection(COL_SUMMONERS).find().project({"id" : 1, "lastUpdated" : 1, "_id" : 0}).toArray().then(function (summonerList) {
    var summonerUpdates = [];
    summonerList.forEach((summoner) => {
      summonerUpdates.push(addSummonerMatchList(summoner.id, summoner.lastUpdated));
      summonerUpdates.push(updateSummonerProfile(summoner.id));
    });
    return Promise.all(summonerUpdates).then(() => {
      return "Summoners successfully updated"
    });
  }).catch((err) => {
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
      matchModels.push(createMatchObject(summonerId, matches[index]));
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

function createMatchObject(summonerId, match) {
  var summStats = getParticipantStats(summonerId, match);
  var matchModel = {
    '_id' : match.matchId,
    'queue' : match.queueType,
    'timestamp' : match.matchCreation,
    'victorious' : summStats.winner,
    'champion' : match.participants[getParticipantId(summonerId, match) - 1].championId,
    'role' : getSummonerRole(summonerId, match),
    'kills' : summStats.kills,
    'deaths' : summStats.deaths,
    'assists' : summStats.assists,
    'rank' : 0
  }

  return matchModel;
}

// Gets ranked stat value from player
function getSummonerRank(id, queue) {
  // default queue is QUEUE_TYPE
  queue = (queue === undefined) ? DEFAULT_QUEUE_TYPE : queue;

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

function getRankScore(tier, division, lp) {
  // 10000 per tier, 1000 per division, + lp
  var score = 0;

  if (tier == "CHALLENGER") {
    score = 70000 + lp;
  } else if (tier == "MASTER") {
    score = 60000 + lp;
  } else {
    // Handle tier
    switch(tier) {
      case "BRONZE":
        break;
      case "SILVER":
        score += 10000;
        break;
      case "GOLD":
        score += 20000;
        break;
      case "PLATINUM":
        score += 30000;
        break;
      case "DIAMOND":
        score += 40000;
        break;
    }

    // Handle division
    switch(division) {
      case "I":
        score += 5000;
        break;
      case "II":
        score += 4000;
        break;
      case "III":
        score += 3000;
        break;
      case "IV":
        score += 2000;
        break;
      case "V":
        score += 1000;
        break;
    }

    // Add lp
    score += lp;

    return score;
  }
}

function wasVictorious(summonerId, match) {
  var summonerIndex = getParticipantId(summonerId, match) - 1; // 0 indexed list
  return match.participants[summonerIndex].stats.winner;
}

function getParticipantId(summonerId, match) {
  var matchParticipant = match.participantIdentities.find(participant => participant.player.summonerId == summonerId);
  return matchParticipant.participantId;
}

function getParticipantStats(summonerId, match) {
  return match.participants[getParticipantId(summonerId, match) - 1].stats;
}

function getSummonerRole(summonerId, match) {
  var participant = match.participants[getParticipantId(summonerId, match) - 1];

  // Jungle, support and adc is contained in Role
  if (participant.timeline.role == ApiRole.JUNGLE) {
    return Role.JUNGLE;
  } else if (participant.timeline.role == ApiRole.SUPPORT) {
    return Role.SUPPORT;
  } else if (participant.timeline.role == ApiRole.ADC) {
    return Role.ADC;
  } else if (participant.timeline.lane == ApiRole.TOP) {
    return Role.TOP;
  } else if (participant.timeline.lane == ApiRole.MID) {
    return Role.MID;
  } else {
    return Role.SUPPORT; // support is the most likely role to get messed up
  }
}

// Export functions
module.exports.initDbConnection = initMongo;
module.exports.deleteSummoner = deleteSummoner;
module.exports.addSummoner = addSummoner;
module.exports.updateAllSummoners = updateAllSummoners;
module.exports.getSummoner = getSummoner;
module.exports.getSummonerMatchStats = getSummonerMatchStats;
