var globals = require('./globals');
var getToken = globals.getToken;
var merge = globals.merge;

// it is a backbone object
module.exports = function Signaler(root) {
    // unique session-id
    var channel = root.channel;

    // unique identifier for the current user
    var userid = root.userid || getToken();

    // self instance
    var signaler = this;

    // object to store all connected peers
    var peers = { };

    // object to store all connected participants's ids
    var participants = { };

    function onSocketMessage(data) {
        // don't get self-sent data
        if (data.userid == userid) return false;
        console.log(data.userid, userid, data);

        // if it is not a leaving alert
        if (!data.leaving) return signaler.onmessage(data);


        root.onleave && root.onleave({
            userid: data.userid
        });

        if (data.broadcaster && data.forceClosingTheEntireSession) leave();

        // closing peer connection
        var peer = peers[data.userid];
        if (peer && peer.peer) {
            try {
                peer.peer.close();
            } catch(e) {
            }
            delete peers[data.userid];
        }
    }

    // it is called when your signaling implementation fires "onmessage"
    this.onmessage = function(message) {
        // if new room detected
        if (message.roomid && message.broadcasting

            // one user can participate in one room at a time
            && !signaler.sentParticipationRequest) {

            // broadcaster's and participant's session must be identical
            root.onconnection(message);

        } else
            // for pretty logging
            console.debug(JSON.stringify(message, function(key, value) {
                if (value && value.sdp) {
                    console.log(value.sdp.type, '————', value.sdp.sdp);
                    return '';
                } else return value;
            }, '————'));

        // if someone shared SDP
        if (message.sdp && message.to == userid)
            this.onsdp(message);

        // if someone shared ICE candidate
        if (message.candidate && message.to == userid)
            this.onice(message);

        // if someone sent participation request
        if (message.participationRequest && message.to == userid) {
            participants[message.userid] = message.userid;
            participationRequest(message);
        }

        // session initiator transmitted new participant's details
        // it is useful for multi-users connectivity
        if (message.conferencing && message.newcomer != userid && !!participants[message.newcomer] == false) {
            participants[message.newcomer] = message.newcomer;
            signaler.signal({
                participationRequest: true,
                to: message.newcomer
            });
        }

        // if current user is suggested to play role of broadcaster
        // to keep active session all the time; event if session initiator leaves
        if (message.playRoleOfBroadcaster === userid)
            this.broadcast({
                roomid: signaler.roomid
            });

        // broadcaster forced the user to leave his room!
        if (message.getOut && message.who == userid) leave();
    };

    function participationRequest(message) {
        // it is appeared that 10 or more users can send
        // participation requests concurrently
        if (!signaler.creatingOffer) {
            signaler.creatingOffer = true;
            createOffer(message);
            setTimeout(function() {
                signaler.creatingOffer = false;
                if (signaler.participants &&
                    signaler.participants.length) repeatedlyCreateOffer();
            }, 5000);
        } else {
            if (!signaler.participants) signaler.participants = [];
            signaler.participants[signaler.participants.length] = message;
        }
    }

    // reusable function to create new offer

    function createOffer(message) {
        var _options = merge(options, {
            to: message.userid
        });
        peers[message.userid] = require('./Offer').createOffer(_options);
    }

    // reusable function to create new offer repeatedly

    function repeatedlyCreateOffer() {
        console.log('signaler.participants', signaler.participants);
        var firstParticipant = signaler.participants[0];
        if (!firstParticipant) return;

        signaler.creatingOffer = true;
        createOffer(firstParticipant);

        // delete "firstParticipant" and swap array
        delete signaler.participants[0];
        signaler.participants = swap(signaler.participants);

        setTimeout(function() {
            signaler.creatingOffer = false;
            if (signaler.participants[0])
                repeatedlyCreateOffer();
        }, 5000);
    }

    this.onice = function(message) {
        var peer = peers[message.userid];
        if (peer) peer.addIceCandidate(message.candidate);
    };

    // if someone shared SDP
    this.onsdp = function(message) {
        var sdp = message.sdp;

        if (sdp.type == 'offer') {
            var _options = merge(options, {
                to: message.userid,
                sdp: sdp
            });
            peers[message.userid] = require('./Answer').createAnswer(_options);
        }

        if (sdp.type == 'answer') {
            peers[message.userid].setRemoteDescription(sdp);
        }
    };

    // it is passed over Offer/Answer objects for reusability
    var options = {
        onsdp: function(e) {
            signaler.signal({
                sdp: e.sdp,
                to: e.userid
            });
        },
        onicecandidate: function(e) {
            signaler.signal({
                candidate: e.candidate,
                to: e.userid
            });
        },
        onopen: function(e) {
            if (root.onopen) root.onopen(e);

            if (!root.channels) root.channels = { };
            root.channels[e.userid] = {
                send: function(message) {
                    root.send(message, this.channel);
                },
                channel: e.channel
            };

            forwardParticipant(e);
        },
        onmessage: function(e) {
            var message = e.data;
            if (!message.size)
                message = JSON.parse(message);

            if (message.type == 'text')
                textReceiver.receive({
                    data: message,
                    root: root,
                    userid: e.userid
                });

            else if (message.size || message.type == 'file')
                fileReceiver.receive({
                    data: message,
                    root: root,
                    userid: e.userid
                });
            else if (root.onmessage)
                root.onmessage(message, e.userid);
        },
        onclose: function(e) {
            if (root.onclose) root.onclose(e);

            var myChannels = root.channels,
                closedChannel = e.currentTarget;

            for (var _userid in myChannels) {
                if (closedChannel === myChannels[_userid].channel)
                    delete root.channels[_userid];
            }

            console.error('DataChannel closed', e);
        },
        onerror: function(e) {
            if (root.onerror) root.onerror(e);

            console.error('DataChannel error', e);
        },
        bandwidth: root.bandwidth
    };

    function forwardParticipant(e) {
        // for multi-users connectivity
        // i.e. video-conferencing
        signaler.isbroadcaster &&
            signaler.signal({
                conferencing: true,
                newcomer: e.userid
            });
    }

    var textReceiver = new (require('./Text')).Receiver;
    var fileReceiver = new (require('./File')).Receiver;

    // call only for session initiator
    this.broadcast = function(_config) {
        _config = _config || { };
        signaler.roomid = _config.roomid || getToken();
        signaler.isbroadcaster = true;
        (function transmit() {
            signaler.signal({
                roomid: signaler.roomid,
                broadcasting: true
            });

            !root.transmitRoomOnce && !signaler.left && setTimeout(transmit, root.interval || 3000);
        })();

        // if broadcaster leaves; clear all JSON files from Firebase servers
        if (socket.onDisconnect) socket.onDisconnect().remove();
    };

    // called for each new participant
    this.join = function(_config) {
        signaler.roomid = _config.roomid;
        this.signal({
            participationRequest: true,
            to: _config.to
        });
        signaler.sentParticipationRequest = true;
    };

    function leave() {
        if (socket.remove) socket.remove();

        signaler.signal({
            leaving: true,

            // is he session initiator?
            broadcaster: !!signaler.broadcaster,

            // is he willing to close the entire session
            forceClosingTheEntireSession: !!root.autoCloseEntireSession
        });

        // if broadcaster leaves; don't close the entire session
        if (signaler.isbroadcaster && !root.autoCloseEntireSession) {
            var gotFirstParticipant;
            for (var participant in participants) {
                if (gotFirstParticipant) break;
                gotFirstParticipant = true;
                participants[participant] && signaler.signal({
                    playRoleOfBroadcaster: participants[participant]
                });
            }
        }

        participants = { };

        // close all connected peers
        for (var peer in peers) {
            peer = peers[peer];
            if (peer.peer) peer.peer.close();
        }
        peers = { };

        signaler.left = true;

        // so, he can join other rooms without page reload
        root.detectedRoom = false;
    }

    // currently you can't eject any user
    // however, you can leave the entire session
    root.eject = root.leave = function(_userid) {
        if (!_userid) return leave();

        // broadcaster can throw any user out of the room
        signaler.broadcaster && signaler.signal({
            getOut: true,
            who: _userid
        });
    };

    // if someone closes the window or tab
    window.onbeforeunload = function() {
        leave();
        // return 'You left the session.';
    };

    // if someone press "F5" key to refresh the page
    window.onkeyup = function(e) {
        if (e.keyCode == 116)
            leave();
    };

    // if someone leaves by clicking a "_blank" link
    var anchors = document.querySelectorAll('a'),
        length = anchors.length;
    for (var i = 0; i < length; i++) {
        var a = anchors[i];
        if (a.href.indexOf('#') !== 0 && a.getAttribute('target') != '_blank')
            a.onclick = function() {
                leave();
            };
    }

    // signaling implementation
    // if no custom signaling channel is provided; use Firebase
    if (!root.openSignalingChannel) {
        if (!window.Firebase) throw 'You must link <https://cdn.firebase.com/v0/firebase.js> file.';

        // Firebase is capable to store data in JSON format
        // root.transmitRoomOnce = true;
        var socket = new window.Firebase('https://zipline.firebaseIO.com/' + channel);
        socket.on('child_added', function(snap) {
            var data = snap.val();
            onSocketMessage(data);

            // we want socket.io behavior;
            // that's why data is removed from firebase servers
            // as soon as it is received
            if (data.userid != userid) snap.ref().remove();
        });

        // method to signal the data
        this.signal = function(data) {
            data.userid = userid;

            // "set" allow us overwrite old data
            // it is suggested to use "set" however preferred "push"!
            socket.push(data);
        };
    } else {
        // custom signaling implementations
        // e.g. WebSocket, Socket.io, SignalR, WebSync, HTTP-based POST/GET, Long-Polling etc.
        var socket = root.openSignalingChannel(function(message) {
            message = JSON.parse(message);
            onSocketMessage(message);
        });

        // method to signal the data
        this.signal = function(data) {
            data.userid = userid;
            socket.emit('message', JSON.stringify(data));
        };
    }
}