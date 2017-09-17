// File that contains the constants and league-related information
// Also used in the loldata endpoint
var config = require('config');

// Ranked Season Constants
const SEASON_START_TIME = config.get("RankedConfig.SEASON_START_TIME");
const RANKED_SOLO = config.get("RankedConfig.RANKED_SOLO");
const RANKED_FLEX = config.get("RankedConfig.RANKED_FLEX");
const DEFAULT_QUEUE_TYPE = config.get("RankedConfig.DEFAULT_QUEUE_TYPE");
const LIST_RANKED_QUEUES = [RANKED_SOLO, RANKED_FLEX];
const RANKED_QUEUES = RANKED_SOLO.concat(RANKED_FLEX);

// Role Constants
var apiRole = {
  TOP : 'TOP',
  JUNGLE : 'NONE',
  MID : 'MIDDLE',
  ADC : 'DUO_CARRY',
  SUPPORT : 'DUO_SUPPORT'
}

var role = {
  TOP : 'top',
  JUNGLE : 'jungle',
  MID : 'mid',
  ADC : 'adc',
  SUPPORT : 'support'
}

module.exports = {
  // Ranked season info
  "SEASON_START_TIME" : SEASON_START_TIME,
  "RANKED_SOLO" : RANKED_SOLO,
  "RANKED_FLEX" : RANKED_FLEX,
  "DEFAULT_QUEUE_TYPE" : DEFAULT_QUEUE_TYPE,
  "RANKED_QUEUES" : RANKED_QUEUES,
  "LIST_RANKED_QUEUES" : LIST_RANKED_QUEUES,

  // Role info
  "role" : role,
  "apiRole" : apiRole,
  "roleList" : [role.TOP, role.JUNGLE, role.MID, role.ADC, role.SUPPORT],

  getRankScore : function (tier, division, lp) {
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
    }

    return score;
  }
}
