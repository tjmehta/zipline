var config = require('../config/current');
var express = require('express');

/* server */
var server = require('http').createServer(app);

/* express */
var app = module.exports = express();
// config
app.set('view engine', 'hbs');
app.engine('hbs', require('hbs').__express);
// middleware
app.use(express.static(__dirname + '/../public'));
app.use(app.router);
// routes
require('./routes')(app);

/* socket.io */
var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {
  if (!io.connected) io.connected = true;

  socket.on('new-channel', function (data) {
      onNewNamespace(data.channel, data.sender);
  });
});
function onNewNamespace(channel, sender) {
  io.of('/' + channel).on('connection', function (socket) {
    if (io.isConnected) {
        io.isConnected = false;
        socket.emit('connect', true);
    }

    socket.on('message', function (data) {
        if (data.sender == sender) socket.broadcast.emit('message', data.data);
    });
  });
}


module.exports = {
  start: function () {
    console.log('Listening on', config.server.port);
    server.listen(config.server.port);
  }
};