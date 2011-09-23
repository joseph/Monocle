Monocle.Panels.eInk = function (flipper, evtCallbacks) {

  var API = { constructor: Monocle.Panels.eInk }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    flipper: flipper
  }


  function initialize() {
    p.panel = new Monocle.Controls.Panel();
    p.reader = p.flipper.properties.reader;
    p.reader.addControl(p.panel);

    p.panel.listenTo({ end: function (panel, x) {
      if (x < p.panel.properties.div.offsetWidth / 2) {
        p.panel.properties.direction = flipper.constants.BACKWARDS;
      } else {
        p.panel.properties.direction = flipper.constants.FORWARDS;
      }
      evtCallbacks.end(panel, x);
    } });

    var s = p.panel.properties.div.style;
    p.reader.listen("monocle:componentchanging", function () {
      s.opacity = 1;
      Monocle.defer(function () { s.opacity = 0 }, 40);
    });
    s.width = "100%";
    s.background = "#000";
    s.opacity = 0;

    if (k.LISTEN_FOR_KEYS) {
      Monocle.Events.listen(window.top.document, 'keyup', handleKeyEvent);
    }
  }


  function handleKeyEvent(evt) {
    var eventCharCode = evt.charCode || evt.keyCode;
    var dir = null;
    if (eventCharCode == k.KEYS["PAGEUP"]) {
      dir = flipper.constants.BACKWARDS;
    } else if (eventCharCode == k.KEYS["PAGEDOWN"]) {
      dir = flipper.constants.FORWARDS;
    }
    if (dir) {
      flipper.moveTo({ direction: dir });
      evt.preventDefault();
    }
  }


  initialize();

  return API;
}


Monocle.Panels.eInk.LISTEN_FOR_KEYS = true;
Monocle.Panels.eInk.KEYS = { "PAGEUP": 33, "PAGEDOWN": 34 };
