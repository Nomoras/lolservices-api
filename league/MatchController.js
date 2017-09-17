//  Handles the parsing of matches
//  These should all be independent of api and database
//  All these functions should by synchronous
var config = require('config');
var _ = require('lodash');
var lolData = require('./LolData.js');

// Filters the match list. For use with the get summoner query. ... I need to organize all this.
function filterMatchList(matchList, options) {
  var queue = (options.queue == 1) ? lolData.RANKED_SOLO : lolData.RANKED_FLEX;
  var limit = (options.limit == 0) ? matchList.length : options.limit;
  var reverse = options.reverse;

  // Filter as necessary
var queueFilteredList = (options.queue == 100) ? matchList.filter(match => lolData.RANKED_QUEUES.includes(match.queue)) : matchList.filter(match => queue.includes(match.queue));
  var championFilteredList = (options.champions.length == 0) ? queueFilteredList : queueFilteredList.filter(match => options.champions.includes(match.champion));
  var roleFilteredList = championFilteredList.filter(match => options.role.includes(match.role));
  var resultFilteredList = roleFilteredList;

  if (options.result == "win") {
    resultFilteredList = roleFilteredList.filter(match => match.victorious);
  } else if (options.result == "lose") {
    resultFilteredList = roleFilteredList.filter(match => !match.victorious);
  }

  var timeFilteredList = resultFilteredList.filter(match => match.timestamp < options.timestamp);

  var finalList = timeFilteredList;

  // Makes sure limit doesn't go overboard
  if (limit > finalList.length) {
    limit = finalList.length;
  }

  // Change limit if the results are being filtered by rank
  if (options.ranklimit != - 1) {
    limit = getMatchIndexUpToRank(finalList, options.ranklimit) + 1;
  }

  return reverse ?
    finalList.slice(finalList.length - limit, finalList.length) :
    finalList.slice(0, limit);

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
    "duration" : _.sumBy(matchList, function(match) { return match.duration}),
    "timestamp" : matchList[matchList.length - 1].timestamp,
    "rank" : matchList[matchList.length - 1].rank
  }

  return result;
}

function getMatchIndexUpToRank(matchList, targetScore) {
  // Gets up to the first game that meets or exceeds the rank
  var maxIndex = matchList.length - 1;

  var i = 0;
  while (i < matchList.length || maxIndex != matchList.length - 1) {
    if (matchList[i].rank != 0) {
      var matchScore = lolData.getRankScore(matchList[i].rank.tier, matchList[i].rank.division, matchList[i].rank.lp)
      if (matchScore >= targetScore) {
        maxIndex = i;
      }
    }
    i++;
  }

  // Return the whole list if the rank is not reached
  return maxIndex;
}

function getPeakRankMatchIndex(matchList) {
  var maxRankScore = 0;
  var maxIndex = matchList.length - 1;

  for (var index = 0; index < matchList.length; index++) {
    if (matchList[index].rank != 0) {
      var currentScore = lolData.getRankScore(matchList[index].rank.tier, matchList[index].rank.division, matchList[index].rank.lp);
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

function createMatchObject(accountId, match) {
  var summStats = getParticipantStats(accountId, match);
  var matchModel = {
    '_id' : match.gameId,
    'queue' : match.queueId,
    'timestamp' : match.gameCreation,
    'duration' : match.gameDuration,
    'victorious' : summStats.win,
    'champion' : match.participants[getParticipantId(accountId, match) - 1].championId,
    'role' : getSummonerRole(accountId, match),
    'kills' : summStats.kills,
    'deaths' : summStats.deaths,
    'assists' : summStats.assists,
    'rank' : 0
  }

  return matchModel;
}

// Utility functions
function getParticipantId(accountId, match) {
  var matchParticipant = match.participantIdentities.find(participant => participant.player.accountId == accountId);
  return matchParticipant.participantId;
}

function getParticipantStats(accountId, match) {
  return match.participants[getParticipantId(accountId, match) - 1].stats;
}

function getSummonerRole(accountId, match) {
  var participant = match.participants[getParticipantId(accountId, match) - 1];

  // Jungle, support and adc is contained in Role
  if (participant.timeline.role == lolData.apiRole.JUNGLE) {
    return lolData.role.JUNGLE;
  } else if (participant.timeline.role == lolData.apiRole.SUPPORT) {
    return lolData.role.SUPPORT;
  } else if (participant.timeline.role == lolData.apiRole.ADC) {
    return lolData.role.ADC;
  } else if (participant.timeline.lane == lolData.apiRole.TOP) {
    return lolData.role.TOP;
  } else if (participant.timeline.lane == lolData.apiRole.MID) {
    return lolData.role.MID;
  } else {
    return lolData.role.SUPPORT; // support is the most likely role to get messed up
  }
}

module.exports.createMatchObject = createMatchObject;
module.exports.getMostRecentMatchIndex = getMostRecentMatchIndex;
module.exports.getPeakRankMatchIndex = getPeakRankMatchIndex;
module.exports.aggregateMatchStats = aggregateMatchStats;
module.exports.filterMatchList = filterMatchList;
