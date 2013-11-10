window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
if (!window.requestFileSystem) {
  alert('Your browser does not support the filesystem api .');
}

function onInitFs(fs) {
    console.log('Opened file system: ' + fs.name);

}

window.requestFileSystem(window.TEMPORARY, 50*1024*1024 /*5MB*/, onInitFs);



function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// Setup the dnd listeners.
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
