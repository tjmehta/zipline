var globals = require('./globals');
var isChrome = globals.isChrome;
var isFirefox = globals.isFirefox;

// FileSaver.SaveToDisk(object);
var FileSaver = {
    SaveToDisk: function(e) {
        var save = document.createElement('a');
        save.href = e.fileURL;
        save.target = '_blank';
        save.download = e.fileName || e.fileURL;

        var evt = document.createEvent('MouseEvents');
        evt.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);

        save.dispatchEvent(evt);
        (window.URL || window.webkitURL).revokeObjectURL(save.href);
    }
};

// new FileReceiver().receive(config);
function FileReceiver() {
    var content = [],
        fileName = '',
        packets = 0,
        numberOfPackets = 0;

    this.receive = function(config) {
        var root = config.root;
        var data = config.data;

        if (isFirefox) {
            if (data.fileName)
                fileName = data.fileName;

            if (data.size) {
                var reader = new window.FileReader();
                reader.readAsDataURL(data);
                reader.onload = function(event) {
                    FileSaver.SaveToDisk({
                        fileURL: event.target.result,
                        fileName: fileName
                    });

                    if (root.onFileReceived)
                        root.onFileReceived({
                            fileName: fileName,
                            userid: config.userid
                        });
                };
            }
        }

        if (isChrome) {
            if (data.packets)
                numberOfPackets = packets = parseInt(data.packets);

            if (root.onFileProgress)
                root.onFileProgress({
                    packets: {
                        remaining: packets--,
                        length: numberOfPackets,
                        received: numberOfPackets - packets
                    },
                    userid: config.userid
                });

            content.push(data.message);

            if (data.last) {
                FileSaver.SaveToDisk({
                    fileURL: content.join(''),
                    fileName: data.name
                });

                if (root.onFileReceived)
                    root.onFileReceived({
                        fileName: data.name,
                        userid: config.userid
                    });
                content = [];
            }
        }
    };
};

// FileSender.send(config);
var FileSender = {
    send: function(config) {
        var root = config.root;
        var file = config.file;

        function send(message) {
            if (isChrome) message = JSON.stringify(message);

            // share data between two unique users i.e. direct messages
            if (config.channel) return config.channel.send(message);

            // share data with all connected users
            var channels = root.channels || { };
            for (var channel in channels) {
                channels[channel].channel.send(message);
            }
        }

        if (isFirefox) {
            send(JSON.stringify({
                fileName: file.name,
                type: 'file'
            }));
            send(file);
            if (root.onFileSent)
                root.onFileSent({
                    file: file,
                    userid: config.userid
                });
        }

        if (isChrome) {
            var reader = new window.FileReader();
            reader.readAsDataURL(file);
            reader.onload = onReadAsDataURL;
        }

        var packetSize = 1000,
            textToTransfer = '',
            numberOfPackets = 0,
            packets = 0;

        function onReadAsDataURL(event, text) {
            var data = {
                type: 'file'
            };

            if (event) {
                text = event.target.result;
                numberOfPackets = packets = data.packets = parseInt(text.length / packetSize);
            }

            if (root.onFileProgress)
                root.onFileProgress({
                    packets: {
                        remaining: packets--,
                        length: numberOfPackets,
                        sent: numberOfPackets - packets
                    },
                    userid: config.userid
                });

            if (text.length > packetSize)
                data.message = text.slice(0, packetSize);
            else {
                data.message = text;
                data.last = true;
                data.name = file.name;

                if (root.onFileSent)
                    root.onFileSent({
                        file: file,
                        userid: config.userid
                    });
            }

            send(data);

            textToTransfer = text.slice(data.message.length);

            if (textToTransfer.length)
                setTimeout(function() {
                    onReadAsDataURL(null, textToTransfer);
                }, 5);
        }
    }
};

module.exports = {
    Receiver: FileReceiver,
    Sender: FileSender
};