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

module.exports.add = addSummoner;
module.exports.delete = deleteSummoner;
