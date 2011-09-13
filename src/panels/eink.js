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

    // TODO: wrapper around evtCallbacks.end to change the direction first.
    p.panel.properties.direction = flipper.constants.FORWARDS;
    p.panel.listenTo(evtCallbacks);

    var s = p.panel.properties.div.style;
    p.reader.listen("monocle:componentchanging", function () {
      s.opacity = 1;
      Monocle.defer(function () { s.opacity = 0 }, 40);
    });
    s.width = "100%";
    s.background = "#000";
    s.opacity = 0;

    // TODO: register pageUp/Down keypress events?
  }


  initialize();

  return API;
}
