var config = require('../config/current');
var express = require('express');

var app = module.exports = express();
// config
app.set('view engine', 'hbs');
app.engine('hbs', require('hbs').__express);
// middleware
app.use(express.static(__dirname + '/../public'));
app.use(app.router);
// routes
require('./routes')(app);
module.exports = {
  start: function () {
    console.log('Listening on', config.server.port);
    app.listen(config.server.port);
  }
};