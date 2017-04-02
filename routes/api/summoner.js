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

module.exports.add = addSummoner;
module.exports.delete = deleteSummoner;
module.exports.update = updateAllSummoners;
