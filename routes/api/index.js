var routes = require('express').Router();
var summonerRoute = require("./summoner");
var lolDataRoute = require("./loldata");

// api routes
// summoner
routes.post("/summoner", summonerRoute.add);
routes.get('/summoner/all', summonerRoute.getAll);
routes.get("/summoner/stats/:name", summonerRoute.getStats);
routes.delete("/summoner/:name", summonerRoute.delete);
routes.get("/summoner/:name", summonerRoute.get);
routes.post('/summoner/update', summonerRoute.update);

// lolData
routes.get("/loldata/rankscore", lolDataRoute.getRankScore);
routes.get("/loldata/roles", lolDataRoute.getRoleList);
routes.get("/loldata/ddcfg", lolDataRoute.getDataDragonConfig);
routes.get("/loldata/champions", lolDataRoute.getChampionMaps);
routes.get("/loldata/lastupdated", lolDataRoute.getLastUpdated);
routes.post("/loldata/clearcache", lolDataRoute.clearCache);


module.exports = routes;
