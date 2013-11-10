var globals = require('./globals');
var RTCPeerConnection     = globals.RTCPeerConnection;
var RTCSessionDescription = globals.RTCSessionDescription;
var RTCIceCandidate       = globals.RTCIceCandidate;
var isFirefox  = globals.isFirefox;
var isChrome   = globals.isChrome;
var STUN       = globals.STUN;
var TURN       = globals.TURN;
var iceServers = globals.iceServers;
var optionalArgument       = globals.optionalArgument;
var offerAnswerConstraints = globals.offerAnswerConstraints;

var getToken = globals.getToken;
var setBandwidth = globals.setBandwidth;
var serializeSdp = globals.serializeSdp;
var swap = globals.swap;
var merge = globals.merge;
var mediaError = globals.mediaError;

var RTCDataChannel = require('./RTCDataChannel');

// var offer = Offer.createOffer(config);
// offer.setRemoteDescription(sdp);
// offer.addIceCandidate(candidate);
var Offer = module.exports = {
    createOffer: function(config) {
        var peer = new RTCPeerConnection(iceServers, optionalArgument);

        RTCDataChannel.createDataChannel(peer, config);

        function sdpCallback() {
            config.onsdp({
                sdp: peer.localDescription,
                userid: config.to
            });
        }

        peer.onicecandidate = function(event) {
            if (!event.candidate) sdpCallback();
        };

        peer.ongatheringchange = function(event) {
            if (event.currentTarget && event.currentTarget.iceGatheringState === 'complete')
                sdpCallback();
        };

        peer.oniceconnectionstatechange = function() {
            // "disconnected" state: Liveness checks have failed for one or more components.
            // This is more aggressive than failed, and may trigger intermittently
            // (and resolve itself without action) on a flaky network.
            if (!!peer && peer.iceConnectionState == 'disconnected') {
                peer.close();
                console.error('iceConnectionState is <disconnected>.');
            }
        };

        if (isChrome) {
            peer.createOffer(function(sdp) {
                sdp = serializeSdp(sdp, config);
                peer.setLocalDescription(sdp);
            }, null, offerAnswerConstraints);

        } else if (isFirefox) {
            navigator.mozGetUserMedia({
                    audio: true,
                    fake: true
                }, function(stream) {
                    peer.addStream(stream);
                    peer.createOffer(function(sdp) {
                        peer.setLocalDescription(sdp);
                        config.onsdp({
                            sdp: sdp,
                            userid: config.to
                        });
                    }, null, offerAnswerConstraints);

                }, mediaError);
        }

        this.peer = peer;

        return this;
    },
    setRemoteDescription: function(sdp) {
        this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
    },
    addIceCandidate: function(candidate) {
        this.peer.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: candidate.sdpMLineIndex,
            candidate: candidate.candidate
        }));
    }
};