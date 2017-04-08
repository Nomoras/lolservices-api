//  Handles the parsing of matches
//  These should all be independent of api and database
//  All these functions should by synchronous
var config = require('config');
var _ = require('lodash');

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

// Utility functions
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

module.exports.createMatchObject = createMatchObject;
module.exports.getMostRecentMatchIndex = getMostRecentMatchIndex;
module.exports.getPeakRankMatchIndex = getPeakRankMatchIndex;
module.exports.aggregateMatchStats = aggregateMatchStats;
module.exports.filterMatchList = filterMatchList;
