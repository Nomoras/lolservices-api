var routes = require('express').Router();
var summoner = require("./summoner");

// endpoint constants
SUMMONER_ENDPOINT = "/summoner/:name"

// api routes
routes.post(SUMMONER_ENDPOINT, summoner.add);
routes.delete(SUMMONER_ENDPOINT, summoner.delete);

// api authentication - placeholder
routes.use('/', function (req, res, next) {
  if (req.headers['auth'] === 'spookyghost') {
    next();
  } else {
    res.status(403).send("Unauthorized");
  }
});

module.exports = routes;
