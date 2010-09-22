Monocle.Controls.Spinner = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Spinner(reader);
  }

  var API = { constructor: Monocle.Controls.Spinner }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    divs: [],
    spinCount: 0
  }


  function createControlElements(cntr) {
    var anim = cntr.dom.make('div', 'controls_spinner_anim');
    p.divs.push(anim);
    return anim;
  }


  // Registers spin/spun event handlers for: loading,componentchanging,resizing.
  function listenForUsualDelays() {
    p.reader.listen('monocle:componentloading', spin);
    p.reader.listen('monocle:componentloaded', spun);
    p.reader.listen('monocle:componentchanging', spin);
    p.reader.listen('monocle:componentchange', spun);
    p.reader.listen('monocle:resizing', resizeSpin);
    p.reader.listen('monocle:resize', resizeSpun);
    p.reader.listen('monocle:stylesheetchanging', spin);
    p.reader.listen('monocle:stylesheetchange', spun);
  }


  function resizeSpin(evt) {
    if (p.resizing) {
      return;
    }
    spin(evt);
    p.resizing = true;
  }


  function resizeSpun(evt) {
    spun(evt);
    p.resizing = false;
  }


  function spin(evt) {
    console.log('Spinning on ' + (evt ? evt.type : 'unknown'));
    p.spinCount += 1;
    p.reader.showControl(API);
  }


  function spun(evt) {
    console.log('Spun on ' + (evt ? evt.type : 'unknown'));
    p.spinCount -= 1;
    if (p.spinCount > 0) { return; }
    p.reader.hideControl(API);
  }


  API.createControlElements = createControlElements;
  API.listenForUsualDelays = listenForUsualDelays;
  API.spin = spin;
  API.spun = spun;

  return API;
}

Monocle.pieceLoaded('controls/spinner');
