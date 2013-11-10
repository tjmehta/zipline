var config = require('../config/current');
var express = require('express');

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

/* server */
var server = require('http').createServer(app);

/* socket.io */
var namespaces = {};
var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {
  console.log('CLIENT CONNECTED');
  if (!io.connected) io.connected = true;

  socket.on('create-room', function (data) {
    onNewNamespace(data.roomid, data.userid);
  });
  socket.on('room-exists', function (roomid, cb) {
    cb(namespaces[roomid]);
  });
});
function onNewNamespace(roomid, userid) {
  namespaces[roomid] = true;
  io.of('/' + roomid).on('connection', function (socket) {
    console.log('CLIENT CONNECTED', roomid);
    if (io.isConnected) {
        io.isConnected = false;
        socket.emit('connect', true);
    }

    socket.on('message', function (data) {
        console.log('socket message do', data);

        var json;
        try {
          json = JSON.parse(data);
        }
        catch (e) {
          return;
        }
        console.log('userid do', json.userid, userid);
        if (json.userid == userid) {
          console.log('broadcasting that shit');
          socket.broadcast.emit('message', json.data);
        }
    });
  });
}


module.exports = {
  start: function () {
    console.log('Listening on', config.server.port);
    server.listen(config.server.port);
  }
};