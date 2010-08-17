Monocle.Panels.TwoPane = function (flipper, evtCallbacks) {

  var API = { constructor: Monocle.Panels.TwoPane }
  var k = API.constants = API.constructor;
  var p = API.properties = {}


  function initialize() {
    p.panels = {
      forwards: new Monocle.Controls.Panel(),
      backwards: new Monocle.Controls.Panel()
    }

    for (dir in p.panels) {
      flipper.properties.reader.addControl(p.panels[dir]);
      p.panels[dir].listenTo(evtCallbacks);
      p.panels[dir].properties.direction = flipper.constants[dir.toUpperCase()];
      with (p.panels[dir].properties.div.style) {
        width = k.WIDTH;
        dir == "forwards" ? right = 0 : left = 0;
      }
    }
  }


  initialize();

  return API;
}

Monocle.Panels.TwoPane.WIDTH = "50%";

Monocle.pieceLoaded('panels/twopane');
