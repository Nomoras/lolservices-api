// Handles routing for /api/summoner/:name
var lolDb = require('../../league/LeagueDbController');
var lolData = require('../../league/LolData');

// Handle adding new summoners
function addSummoner (req, res) {
  res.send(lolDb.addSummoner(req.body.name));
};

// Handle deleting summoners
function deleteSummoner (req, res) {
  res.send(lolDb.deleteSummoner(req.params.name));
};

// Initiate complete update of summoners in db
function updateAllSummoners (req, res) {
  res.send({"res" : lolDb.updateAllSummoners()});
}

// Get all summoner names
function getAllSummoners (req, res) {
  res.send(lolDb.getAllSummoners());
}

// Get raw summoner object from db
function getSummoner(req, res) {
  res.send(lolDb.getSummoner(req.params.name));
}

// Get summoner match stats by filter
function getSummonerStats(req, res) {
  var options = {
    "limit" : 0,
    "queue" : 100,
    "reverse" : false,
    "role" : lolData.roleList,
    "champions" : [],
    "ranklimit" : -1,
    "result" : 0,
    "peak" : false
  }

  // Overwrite options as necessary
  if (req.query.limit != undefined) {
    options.limit = parseInt(req.query.limit);
  }

  if (req.query.queue != undefined) {
    options.queue = parseInt(req.query.queue);
  }

  if (req.query.reverse == "true") {
    options.reverse = true;
  }

  if (req.query.peak == "true") {
    options.peak = true;
  }

  if (req.query.role != undefined) {
    options.role = req.query.role.split(",");
  }

  if (req.query.champions != undefined) {
    options.champions = req.query.champions.split(",");
    for (var index = 0; index < options.champions.length; index++) {
      options.champions[index] = parseInt(options.champions[index]);
    }
  }

  if (req.query.ranklimit != undefined) {
    options.ranklimit = parseInt(req.query.ranklimit);
  }

  if (req.query.result != undefined) {
    options.result = req.query.result;
  }

  res.send(lolDb.getSummonerMatchStats(req.params.name, options));
}

module.exports = {
  "add" : addSummoner,
  "delete" : deleteSummoner,
  "update" : updateAllSummoners,
  "get" : getSummoner,
  "getAll" : getAllSummoners,
  "getStats" : getSummonerStats
}
