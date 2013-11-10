// reusable stuff
var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.URL = window.webkitURL || window.URL;

var isFirefox = !!navigator.mozGetUserMedia;
var isChrome = !!navigator.webkitGetUserMedia;

var STUN = {
    url: isChrome ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
};

// old TURN syntax
var TURN = {
    url: 'turn:homeo@turn.bistri.com:80',
    credential: 'homeo'
};

var iceServers = {
    iceServers: [STUN]
};

if (isChrome) {
    // in chrome M29 and higher
    if (parseInt(navigator.userAgent.match( /Chrom(e|ium)\/([0-9]+)\./ )[2]) >= 28)
        TURN = {
            url: 'turn:turn.bistri.com:80',
            credential: 'homeo',
            username: 'homeo'
        };

    // No STUN to make sure it works all the time!
    iceServers.iceServers = [STUN, TURN];
}

var optionalArgument = {
    optional: [{
        RtpDataChannels: true
    }]
};

var offerAnswerConstraints = {
    optional: [],
    mandatory: {
        OfferToReceiveAudio: isFirefox,
        OfferToReceiveVideo: isFirefox
    }
};

function getToken() {
    return Math.round(Math.random() * 60535) + 5000;
}

function setBandwidth(sdp, bandwidth) {
    bandwidth = bandwidth || { };

    // remove existing bandwidth lines
    sdp = sdp.replace( /b=AS([^\r\n]+\r\n)/g , '');
    sdp = sdp.replace( /a=mid:data\r\n/g , 'a=mid:data\r\nb=AS:' + (bandwidth.data || 1638400) + '\r\n');

    return sdp;
}

function serializeSdp(sessionDescription, config) {
    if (isFirefox) return sessionDescription;

    var sdp = sessionDescription.sdp;
    sdp = setBandwidth(sdp, config.bandwidth);
    sessionDescription.sdp = sdp;
    return sessionDescription;
}

// swap arrays

function swap(arr) {
    var swapped = [],
        length = arr.length;
    for (var i = 0; i < length; i++)
        if (arr[i] && arr[i] !== true)
            swapped[swapped.length] = arr[i];
    return swapped;
}

function merge(mergein, mergeto) {
    for (var item in mergeto) {
        mergein[item] = mergeto[item];
    }
    return mergein;
}

function mediaError() {
    throw 'Unable to get access to fake audio.';
}

module.exports = {
  RTCPeerConnection: RTCPeerConnection,
  RTCSessionDescription: RTCSessionDescription,
  RTCIceCandidate: RTCIceCandidate,
  isFirefox: isFirefox,
  isChrome: isChrome,
  STUN: STUN,
  TURN: TURN,
  iceServers: iceServers,
  optionalArgument: optionalArgument,
  offerAnswerConstraints: offerAnswerConstraints,
  getToken: getToken,
  setBandwidth: setBandwidth,
  serializeSdp: serializeSdp,
  swap: swap,
  merge: merge,
  mediaError: mediaError
}