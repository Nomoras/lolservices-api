// Handles routing for /api/summoner/:name
var lolDb = require('../../LeagueDbController');

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

// Get raw summoner object from db
function getSummoner(req, res) {
  res.send(lolDb.getSummoner(req.params.name));
}

// Get summoner match stats by filter
function getSummonerStats(req, res) {
  var options = {
    "limit" : 0,
    "queue" : 1,
    "reverse" : false
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

  res.send(lolDb.getSummonerMatchStats(req.params.name, options));
}

module.exports.add = addSummoner;
module.exports.delete = deleteSummoner;
module.exports.update = updateAllSummoners;
module.exports.get = getSummoner;
module.exports.getStats = getSummonerStats;
