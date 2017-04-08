var routes = require('express').Router();
var apiRoutes = require('./api');


// api routes
routes.use('/api', apiRoutes);

// index route
routes.use('/', function (req, res, next) {
  if (req.url === "/") {
    res.send("Boo!");
  } else {
    next();
  }
})

module.exports = routes;
