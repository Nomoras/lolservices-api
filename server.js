// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var Promise = require('bluebird');
var _ = require('lodash');
var MongoClient = require('mongodb').MongoClient;
var config = require('config');

// User dependencies
var lolDb = require('./league/LeagueDbController');
var routes = require('./routes');

// Create express application
var app = express();

// Constants
const APP_PORT = config.get("APP_PORT");
const DB_PATH = config.get("DB_PATH");

// Add middleware for REST APIs
app.use(require('express-promise')());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

// CORS support for rest api
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Setup routing
app.use('/', routes);

MongoClient.connect(DB_PATH).then(function (db) {
  lolDb.initDbConnection(db);
  console.log('Listening on port ' + APP_PORT);
  app.listen(APP_PORT);

  // Update once every 15 minutes
  lolDb.updateAllSummoners();
  setInterval(lolDb.updateAllSummoners, config.get("REFRESH_TIME"));
});

module.exports = app;
