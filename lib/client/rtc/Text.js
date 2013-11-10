// TextSender.send(config);
var TextSender = {
    send: function(config) {
        var root = config.root;

        function send(message) {
            message = JSON.stringify(message);

            // share data between two unique users i.e. direct messages
            if (config.channel) return config.channel.send(message);

            // share data with all connected users
            var channels = root.channels || { };
            for (var channel in channels) {
                channels[channel].channel.send(message);
            }
        }


        var initialText = config.text,
            packetSize = 1000,
            textToTransfer = '';

        if (typeof initialText !== 'string')
            initialText = JSON.stringify(initialText);

        if (window.isFirefox || initialText.length <= packetSize)
            send(config.text);
        else
            sendText(initialText);

        function sendText(textMessage, text) {
            var data = {
                type: 'text'
            };

            if (textMessage) {
                text = textMessage;
                data.packets = parseInt(text.length / packetSize);
            }

            if (text.length > packetSize)
                data.message = text.slice(0, packetSize);
            else {
                data.message = text;
                data.last = true;
            }

            send(data);

            textToTransfer = text.slice(data.message.length);

            if (textToTransfer.length)
                setTimeout(function() {
                    sendText(null, textToTransfer);
                }, 500);
        }
    }
};

// new TextReceiver().receive(config);
function TextReceiver() {
    var content = [];

    function receive(config) {
        var root = config.root;
        var data = config.data;

        content.push(data.message);
        if (data.last) {
            if (root.onmessage)
                root.onmessage({
                    data: content.join(''),
                    userid: config.userid
                });
            content = [];
        }
    }

    return {
        receive: receive
    };
}


module.exports = {
    Sender: TextSender,
    Receiver: TextReceiver
};