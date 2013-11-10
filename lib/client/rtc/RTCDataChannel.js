// RTCDataChannel.createDataChannel(peer, config);
// RTCDataChannel.setChannelEvents(channel, config);
var RTCDataChannel = module.exports = {
    createDataChannel: function(peer, config) {
        var channel = peer.createDataChannel('RTCDataChannel', {
            reliable: false
        });
        this.setChannelEvents(channel, config);
    },
    setChannelEvents: function(channel, config) {
        channel.onopen = function() {
            config.onopen({
                channel: channel,
                userid: config.to
            });
        };

        channel.onmessage = function(e) {
            config.onmessage({
                data: e.data,
                userid: config.to
            });
        };

        channel.onclose = function(event) {
            config.onclose({
                event: event,
                userid: config.to
            });
        };

        channel.onerror = function(event) {
            config.onerror({
                event: event,
                userid: config.to
            });
        };
    }
};