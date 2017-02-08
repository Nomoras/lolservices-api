var routes = require('express').Router();
var summoner = require("./summoner");

// api authentication - placeholder
routes.use('/', function (req, res, next) {
  if (req.headers['auth'] === 'spookyghost') {
    next();
  } else {
    res.status(403).send("Unauthorized");
  }
});

// api routes
routes.post("/summoner", summoner.add);
routes.delete("/summoner/:name", summoner.delete);

module.exports = routes;
