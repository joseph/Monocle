Monocle.Controls.Spinner = function (reader) {

  var API = { constructor: Monocle.Controls.Spinner }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    divs: [],
    repeaters: {},
    showForPages: []
  }


  function createControlElements(cntr) {
    var anim = cntr.dom.make('div', 'controls_spinner_anim');
    anim.dom.append('div', 'controls_spinner_inner');
    p.divs.push(anim);
    return anim;
  }


  function registerSpinEvent(startEvtType, stopEvtType) {
    var label = startEvtType;
    p.reader.listen(startEvtType, function (evt) { spin(label, evt) });
    p.reader.listen(stopEvtType, function (evt) { spun(label, evt) });
  }


  // Registers spin/spun event handlers for certain time-consuming events.
  //
  function listenForUsualDelays() {
    registerSpinEvent('monocle:componentloading', 'monocle:componentloaded');
    registerSpinEvent('monocle:componentchanging', 'monocle:componentchange');
    registerSpinEvent('monocle:resizing', 'monocle:resize');
    registerSpinEvent('monocle:jumping', 'monocle:jump');
    registerSpinEvent('monocle:recalculating', 'monocle:recalculated');
    p.reader.listen('monocle:notfound', forceSpun);
    p.reader.listen('monocle:componentfailed', forceSpun);
  }


  // Displays the spinner. Both arguments are optional.
  //
  function spin(label, evt) {
    label = label || k.GENERIC_LABEL;
    p.repeaters[label] = true;
    p.reader.showControl(API);

    // If the delay is on a page other than the page we've been assigned to,
    // don't show the animation. p.global ensures that if an event affects
    // all pages, the animation is always shown, even if other events in this
    // spin cycle are page-specific.
    var page = (evt && evt.m && evt.m.page) ? evt.m.page : null;
    if (page && p.divs.length > 1) {
      p.showForPages[page.m.pageIndex] = true;
    } else {
      p.global = true;
      p.reader.dispatchEvent('monocle:modal:on');
    }
    for (var i = 0; i < p.divs.length; ++i) {
      var show = (p.global || p.showForPages[i]) ? true : false;
      p.divs[i].dom[show ? 'removeClass' : 'addClass']('dormant');
    }
  }


  // Stops displaying the spinner. Both arguments are optional.
  //
  function spun(label, evt) {
    label = label || k.GENERIC_LABEL;
    p.repeaters[label] = false;
    for (var l in p.repeaters) {
      if (p.repeaters[l]) { return; }
    }
    forceSpun();
  }


  function forceSpun() {
    if (p.global) { p.reader.dispatchEvent('monocle:modal:off'); }
    p.global = false;
    p.repeaters = {};
    p.showForPages = [];
    for (var i = 0; i < p.divs.length; ++i) {
      p.divs[i].dom.addClass('dormant');
    }
  }


  API.createControlElements = createControlElements;
  API.registerSpinEvent = registerSpinEvent;
  API.listenForUsualDelays = listenForUsualDelays;
  API.spin = spin;
  API.spun = spun;
  API.forceSpun = forceSpun;

  return API;
}

Monocle.Controls.Spinner.GENERIC_LABEL = "generic";
