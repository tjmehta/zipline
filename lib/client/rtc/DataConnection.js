// 2013, @muazkh - github.com/muaz-khan
// MIT License - https://webrtc-experiment.appspot.com/licence/
// Documentation (file sharing) - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/file-sharing
// Documentation (text chat)    - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/text-chat

// a middle-agent between public API and the Signaler object
var DataConnection = module.exports = function(channel, userid) {
    var signaler, self = this;

    this.channel = channel || location.href.replace( /\/|:|#|%|\.|\[|\]/g , '');
    this.userid = userid;

    // on each new session
    this.onconnection = function(room) {
        if (self.detectedRoom) return;
        self.detectedRoom = true;

        if (self._roomid && self._roomid != room.roomid) return;

        self.join(room);
    };

    function initSignaler() {
        signaler = new (require('./Signaler'))(self);
    }

    // setup new connection
    this.setup = function(roomid) {
        self.detectedRoom = true;
        !signaler && initSignaler();
        signaler.broadcast({
            roomid: roomid || getToken()
        });
    };

    // join pre-created data connection
    this.join = function(room) {
        !signaler && initSignaler();
        signaler.join({
            to: room.userid,
            roomid: room.roomid
        });
    };

    this.send = function(data, _channel) {
        if (!data) throw 'No file, data or text message to share.';
        if (data.size)
            require('./File').Sender.send({
                file: data,
                root: self,
                channel: _channel,
                userid: self.userid
            });
        else
            require('./Text').Sender.send({
                text: data,
                root: self,
                channel: _channel,
                userid: self.userid
            });
    };

    this.check = function(roomid) {
        self._roomid = roomid;
        initSignaler();
    };
};






