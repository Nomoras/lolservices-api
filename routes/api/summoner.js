// Handles routing for /api/summoner/:name
var lolDb = require('../../LeagueDbController');

// Handle adding new summoners
function addSummoner (req, res) {
  console.log("Add summoner request received for: " + req.params.name);
  res.send(lolDb.addSummoner(req.params.name));
};

// Handle deleting summoners
function deleteSummoner (req, res) {
  console.log("Delete request called for: " + req.params.name);
  res.send(lolDb.deleteSummoner(req.params.name));
};

module.exports.add = addSummoner;
module.exports.delete = deleteSummoner;
