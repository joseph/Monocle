// Provides page-flipping panels only in the margins of the book. This is not
// entirely suited to small screens with razor-thin margins, but is an
// appropriate panel class for larger screens (like, say, an iPad).
//
// Since the flipper hit zones are only in the margins, the actual text content
// of the book is always selectable.
//
Monocle.Panels.Marginal = function (flipper, evtCallbacks) {

  var API = { constructor: Monocle.Panels.Marginal }
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
        dir == "forwards" ? right = 0 : left = 0;
      }
    }
    setWidths();

    if (flipper.interactiveMode) {
      flipper.interactiveMode(true);
    }
  }


  function setWidths() {
    var page = flipper.properties.reader.dom.find('page');
    var sheaf = page.m.sheafDiv;
    var bw = sheaf.offsetLeft;
    var fw = page.offsetWidth - (sheaf.offsetLeft + sheaf.offsetWidth);
    bw = Math.floor(((bw - 2) / page.offsetWidth) * 10000 / 100 ) + "%";
    fw = Math.floor(((fw - 2) / page.offsetWidth) * 10000 / 100 ) + "%";
    p.panels.forwards.properties.div.style.width = fw;
    p.panels.backwards.properties.div.style.width = bw;
  }


  API.setWidths = setWidths;

  initialize();

  return API;
}

Monocle.pieceLoaded('panels/marginal');
