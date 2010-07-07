Monocle.Panels.TwoPane = function (flipper, evtCallbacks) {
  if (Monocle.Panels == this) {
    return new Monocle.Panels.TwoPane(flipper, evtCallbacks);
  }

  var k = Monocle.Panels.TwoPane;

  var p = {
  }

  var API = {
    constructor: Monocle.Panels.TwoPane,
    properties: p,
    constants: Monocle.Panels.TwoPane
  }


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
      p.panels[dir].properties.div.style.width = k.WIDTH;
    }
  }


  initialize();

  return API;
}

Monocle.Panels.TwoPane.WIDTH = "50%";
