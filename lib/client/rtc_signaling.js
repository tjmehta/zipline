if (!window.createSignalingChannel) {
  alert('Your browser is not supported son.');
}
else {
  var channel = createSignalingChannel();
  var config = {};
  var conn = new RTCPeerConnection(config);

  function start (isCaller) {
    conn.onicecandidate = function (evt) {
      channel.send(
        JSON.stringify({ candidate:evt.candidate })
      );
    };
    conn.onaddstream = function (evt) {
      var videoStream = URL.createObjectURL(evt.stream);
    };

    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
      selfView.src = URL.createObjectURL(stream);
      conn.addStream(stream);

      if (isCaller)
        conn.createOffer(gotDescription);
      else
        conn.createAnswer(conn.remoteDescription, gotDescription);

      function gotDescription(desc) {
        conn.setLocalDescription(desc);
        channel.send(JSON.stringify({ "sdp": desc }));
      }
    });
  }

  channel.onmessage = function (evt) {
    if (!conn) start(false);

    var signal = JSON.parse(evt.data);
    if (signal.sdp) {
      conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    }
    else {
      conn.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }
}
