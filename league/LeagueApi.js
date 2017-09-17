// Module to work with functions related to League api
var jsonRequest = require('request-json');
var config = require('config');
var qs = require('querystring');
var Promise = require('bluebird');
var pThrottle = require('p-throttle');


// Cache for previous requests
var cache = {};

// Fill in from config or environment variable
var API_KEY = config.get("LeagueApi.API_KEY");

if (API_KEY === "LeagueAPIKEY") {
  API_KEY = process.env.LOL_API_KEY;
}

// Querying constants for API
const REQUEST_DELAY = config.get("LeagueApi.request_delay") * 1000; // 1.25s per request to abide 500 / 10 min
const MAX_TRIES = 10;
const REGION = 'na1'
const API_URL = 'https://' + REGION + '.api.riotgames.com/lol/'
const MATCH_HISTORY_URL = 'matchhistory.na.leagueoflegends.com/en/#match-details/NA1/'

// Endpoint version constants
const VERSION = {
  'summoner':'v3',
  'match':'v3',
  'staticData':'v3',
  'league' : 'v3'
};

// API object - valid endpoints
const ENDPOINT = {
  'summoner-by-name': 'summoner/' + VERSION.summoner + '/summoners/by-name/',
  'summoner-by-id': 'summoner/' + VERSION.summoner + '/summoners/',
  'matchlist': 'match/' + VERSION.match + '/matchlists/by-account/',
  'match' :  'match/' + VERSION.match + '/matches/',
  'league' : 'league/' + VERSION.league + '/positions/by-summoner/',
  'staticData' : 'static-data/' + VERSION.staticData + "/"
};

// request client object
var client = jsonRequest.createClient(API_URL);

const query = pThrottle(rawQuery, 1, REQUEST_DELAY);

// General query method - rate limitted via p-throttle
function rawQuery(requestClient, endpoint, acceptedResponses, tries) {
  if (tries === undefined) {
    tries = 0;
  }

  if (acceptedResponses === undefined) {
    acceptedResponses = [200];
  }

  var currentResult = {};

  return requestClient.get(endpoint).then(function (result) {
    statusCode = result.res.statusCode;
    if (acceptedResponses.indexOf(statusCode) > -1) {
      currentResult = result.res.body;
      cache[endpoint] = currentResult;
      return Promise.resolve(currentResult);
    } else if (tries < MAX_TRIES){
      console.log(statusCode + ": " + endpoint);
      return query(requestClient, endpoint, acceptedResponses, ++tries);
    } else {
      return Promise.reject("Max tries exceeded for " + endpoint);
    }
  });
}

// Query request method - retries until valid
// options object: { "isStatic" : bool , "forceUpdate" : bool}
function request(apiMethodName, parameter, queries, options) {
  if (queries == undefined) {
    queries = {};
  }

  if (options == undefined) {
    options = {
      forceUpdate : false,
      acceptedResponses : [200]
    }
  }

  queries.api_key = API_KEY;

  // Construct url from api method based on static or non-static request
  var endpoint = ENDPOINT[apiMethodName] + parameter + "?" + qs.stringify(queries);

  // Retrieve from cache if possible
  if (options.forceUpdate == false && endpoint in cache) {
    //console.log("Cached copy found for request.");
    return Promise.resolve(cache[endpoint]);
  }

  // Make request if nothing cached
  return query(client, endpoint, options.acceptedResponses);
}

// exports
// Find summoner by name
module.exports.getSummonerByName = function(name) {
  return request('summoner-by-name', name);
}

// Find summoner by id
module.exports.getSummonerById = function(id) {
  return request('summoner-by-id', id);
}

// Find match list by summoner id
module.exports.getMatchListFromSummoner = function (summonerId, queries) {
  return request('matchlist', summonerId, queries, {"forceUpdate" : true, "acceptedResponses": [200, 404, 422]});
}

// Find match by match id
module.exports.getMatchFromId = function (matchId) {
  return request('match', matchId);
}

// Find summoner stat
module.exports.getLeagueInfo = function (summonerId) {
  return request('league', summonerId, {}, {"forceUpdate" : true});
}

// Get static data
module.exports.getStaticData = function (param) {
  return request('staticData', param);
}

// Clear cache
module.exports.clearCache = function () {
  console.log("Cache cleared:");
  console.log(cache);
  cache = {};
}
