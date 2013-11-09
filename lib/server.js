var config = require('../config/current');
var express = require('express');

var app = module.exports = express();
// middleware
app.use(express.static(__dirname + '/../public'));

module.exports = {
  start: function () {
    app.listen(config.server.port);
  }
}