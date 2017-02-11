// Module to work with functions related to League api
var jsonRequest = require('request-json');
var config = require('config');
var qs = require('querystring');
var Promise = require('bluebird');
var retry = require('bluebird-retry');

// Cache for previous requests
var cache = {};

// Fill in from config or environment variable
var API_KEY = config.get("LeagueApi.API_KEY");

if (API_KEY === "LeagueAPIKEY") {
  API_KEY = process.env.LOL_API_KEY;
}

// Querying constants for API
const REQUEST_DELAY = config.get("LeagueApi.request_delay"); // 1.25s per request to abide 500 / 10 min
const REGION = 'na'
const API_URL = 'https://' + REGION + '.api.pvp.net/api/lol/'
const STATIC_DATA_URL = "https://global.api.pvp.net/api/lol/static-data/" + REGION + "/";
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
  'league' : REGION + '/' + VERSION.league + '/by-summoner/'
};

// request client object
var client = jsonRequest.createClient(API_URL);
var staticClient = jsonRequest.createClient(STATIC_DATA_URL);

// General query method, w/ rate limiting built in
function query(requestClient, endpoint) {
  var currentResult = {};

  return requestClient.get(endpoint).then(function (result) {
    statusCode = result.res.statusCode;
    if (statusCode == 200) {
      currentResult = result.res.body;
      cache[endpoint] = currentResult;
      return Promise.resolve(currentResult);
    } else {
      return Promise.reject();
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

  //console.log("Request: " + API_URL + endpoint);

  // Retrieve from cache if possible
  if (options.forceUpdate == false && endpoint in cache) {
    //console.log("Cached copy found for request.");
    return Promise.resolve(cache[endpoint]);
  }

  // if not, retry until a result is achieved
  var retryOptions = {
    'args' : [queryClient, endpoint],
    'interval': retryDelay,
    'maxTries' : -1,
    'backoff' : 1.2,
    'max_interval' : 5000
  };

  // Retry until promise is fulfilled
  return retry(query, retryOptions);
}

// exports
// Find summoner by name
module.exports.getSummonerByName = function(name) {
  return request('summoner-by-name', name);
}

// Find match list by summoner id
module.exports.getMatchListFromSummoner = function (summonerId, queries) {
  return request('matchlist', summonerId, queries, {"isStatic" : false, "forceUpdate" : true});
}

// Find match by match id
module.exports.getMatchFromId = function (matchId, queries) {
  return request('match', matchId, queries);
}
