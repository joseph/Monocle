Monocle.Controls.Spinner = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Spinner(reader);
  }

  var API = { constructor: Monocle.Controls.Spinner }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    divs: [],
    spinCount: 0,
    repeaters: {},
    showForPages: []
  }


  function createControlElements(cntr) {
    var anim = cntr.dom.make('div', 'controls_spinner_anim');
    p.divs.push(anim);
    return anim;
  }


  function registerSpinEvt(startEvtType, stopEvtType) {
    var label = startEvtType;
    p.reader.listen(startEvtType, function (evt) { spin(label, evt) });
    p.reader.listen(stopEvtType, function (evt) { spun(label, evt) });
  }


  // Registers spin/spun event handlers for certain time-consuming events.
  //
  function listenForUsualDelays() {
    registerSpinEvt('monocle:componentloading', 'monocle:componentloaded');
    registerSpinEvt('monocle:componentchanging', 'monocle:componentchange');
    registerSpinEvt('monocle:resizing', 'monocle:resize');
    registerSpinEvt('monocle:jumping', 'monocle:jump');
    registerSpinEvt('monocle:recalculating', 'monocle:recalculated');
  }


  // Displays the spinner. Both arguments are optional.
  //
  function spin(label, evt) {
    label = label || k.GENERIC_LABEL;
    //console.log('Spinning on ' + (evt ? evt.type : label));
    p.repeaters[label] = true;
    p.reader.showControl(API);

    // If the delay is on a page other than the page we've been assigned to,
    // don't show the animation. p.global ensures that if an event affects
    // all pages, the animation is always shown, even if other events in this
    // spin cycle are page-specific.
    var page = evt && evt.m && evt.m.page ? evt.m.page : null;
    if (!page) { p.global = true; }
    for (var i = 0; i < p.divs.length; ++i) {
      var owner = p.divs[i].parentNode.parentNode;
      if (page == owner) { p.showForPages.push(page); }
      var show = p.global || p.showForPages.indexOf(page) >= 0;
      p.divs[i].style.display = show ? 'block' : 'none';
    }
  }


  // Stops displaying the spinner. Both arguments are optional.
  //
  function spun(label, evt) {
    label = label || k.GENERIC_LABEL;
    //console.log('Spun on ' + (evt ? evt.type : label));
    p.repeaters[label] = false;
    for (var l in p.repeaters) {
      if (p.repeaters[l]) { return; }
    }
    p.global = false;
    p.showForPages = [];
    p.reader.hideControl(API);
  }


  API.createControlElements = createControlElements;
  API.listenForUsualDelays = listenForUsualDelays;
  API.spin = spin;
  API.spun = spun;

  return API;
}

Monocle.Controls.Spinner.GENERIC_LABEL = "generic";
Monocle.pieceLoaded('controls/spinner');
