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
const REGION = 'na'
const API_URL = 'https://' + REGION + '.api.riotgames.com/api/lol/'
const STATIC_DATA_URL = "https://global.api.riotgames.com/api/lol/static-data/" + REGION + "/";
const MATCH_HISTORY_URL = 'matchhistory.na.leagueoflegends.com/en/#match-details/NA1/'

// Endpoint version constants
const VERSION = {
  'summoner':'v1.4',
  'matchlist':'v2.2',
  'match':'v2.2',
  'staticData':'v1.2',
  'league' : 'v2.5'
};

// API object - valid endpoints
const ENDPOINT = {
  'summoner-by-name': REGION + '/' + VERSION.summoner + '/summoner/by-name/',
  'summoner-by-id': REGION + '/' + VERSION.summoner + '/summoner/',
  'matchlist': REGION + '/' + VERSION.matchlist + '/matchlist/by-summoner/',
  'match' : REGION + '/' + VERSION.match + '/match/',
  'league' : REGION + '/' + VERSION.league + '/league/by-summoner/'
};

// request client object
var client = jsonRequest.createClient(API_URL);
var staticClient = jsonRequest.createClient(STATIC_DATA_URL);

const query = pThrottle(rawQuery, 1, REQUEST_DELAY);

// General query method - rate limitted via p-throttle
function rawQuery(requestClient, endpoint, tries) {
  if (tries === undefined) {
    tries = 0;
  }

  var currentResult = {};

  return requestClient.get(endpoint).then(function (result) {
    statusCode = result.res.statusCode;
    if (statusCode == 200) {
      currentResult = result.res.body;
      cache[endpoint] = currentResult;
      return Promise.resolve(currentResult);
    } else if (tries < MAX_TRIES){
      console.log(statusCode + ": " + endpoint);
      return query(requestClient, endpoint, tries++);
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
      isStatic : false,
      forceUpdate : false
    }
  }

  queries.api_key = API_KEY;

  // Construct url from api method based on static or non-static request
  var endpoint;
  var retryDelay;
  var queryClient;

  if (options.isStatic) {
    endpoint = VERSION['staticData'] + "/" + parameter + "?" + qs.stringify(queries);
    queryClient = staticClient;
    retryDelay = 0;
  } else {
    endpoint = ENDPOINT[apiMethodName] + parameter + "?" + qs.stringify(queries);
    queryClient = client;
    retryDelay = REQUEST_DELAY;
  }

  // Retrieve from cache if possible
  if (options.forceUpdate == false && endpoint in cache) {
    //console.log("Cached copy found for request.");
    return Promise.resolve(cache[endpoint]);
  }

  // Make request if nothing cached
  return query(queryClient, endpoint);
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
  return request('matchlist', summonerId, queries, {"isStatic" : false, "forceUpdate" : true});
}

// Find match by match id
module.exports.getMatchFromId = function (matchId, queries) {
  return request('match', matchId, queries);
}

// Find summoner stat
module.exports.getLeagueInfo = function (summonerId) {
  return request('league', summonerId + "/entry", {}, {"isStatic" : false, "forceUpdate" : true});
}
