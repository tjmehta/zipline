require('./client/filesystem');
var id = require('./id');

var roomid = window.shareId;

// document.querySelector('input[type=file]').onchange = function() {
//     var file = this.files[0];
//     connection.send(file);
// };

function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var files = evt.dataTransfer.files; // FileList object.

  // files is a FileList of File objects. List some properties.
  var output = [];
  for (var i = 0, f; f = files[i]; i++) {
    output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
                f.size, ' bytes, last modified: ',
                f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
                '</li>');
  }
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
  connection.send(file);
}

var connection = new DataConnection();

connection.userid = id.generate();

// on data connection opens
connection.onopen = function(e) {
    document.getElementById('file').disabled = false;
    appendDIV('Data connection opened between you and ' + e.userid, e.userid);
};

// on data connection error
connection.onerror = function(e) {
    console.debug('Error in data connection. Target user id', e.userid, 'Error', e);
};

// on data connection close
connection.onclose = function(e) {
    console.debug('Data connection closed. Target user id', e.userid, 'Error', e);
};

// on file in progress
connection.onFileProgress = function(e) {
    appendDIV(e.packets.remaining + ' packets remaining.', e.userid);
};

// on file successfully sent
connection.onFileSent = function(e) {
    appendDIV(e.file.name + ' sent.', e.userid);
};

// on file successfully received
connection.onFileReceived = function(e) {
    appendDIV(e.fileName + ' received.', e.userid);
};

// custom signaling gateway
connection.openSignalingChannel = function(callback) {
    return io.connect().on('message', callback);
};

// if someone leaves; just remove his video
connection.onuserleft = function(userid) {
    appendDIV(userid + ' Left.', userid);
};

// check pre-created data connections
connection.check(roomid);

document.getElementById('setup-new-connection').onclick = function() {
    // setup new data connection
    connection.setup(roomid);
    this.disabled = true;

    this.parentNode.innerHTML = '<h2><a href="' + location.href + '" target="_blank">Share this link</a></h2>';
};

var fileProgress = document.getElementById('file-progress');

function appendDIV(data) {
    var div = document.createElement('div');
    div.innerHTML = data;

    fileProgress.insertBefore(div, fileProgress.firstChild);

    div.tabIndex = 0;
    div.focus();
}
