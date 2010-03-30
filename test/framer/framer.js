function createToC(reader) {
  var toc = Monocle.Controls.Contents(reader);
  reader.addControl(toc, 'popover');
  reader.addListener(
    'monocle:contact:start:unhandled',
    function () {
      reader.showControl(toc);
    }
  );
}


// Called by frameLoaded after the reader object is instantiated.
// Be careful of overriding a function like this.
function onMonocleReader(reader) {
  createToC(reader);
}
