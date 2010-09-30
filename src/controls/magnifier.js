Monocle.Controls.Magnifier = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Magnifier(reader);
  }

  // Public methods and properties.
  var API = { constructor: Monocle.Controls.Magnifier }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    buttons: []
  }


  function initialize() {
    p.reader = reader;
  }


  function createControlElements(holder) {
    var btn = holder.dom.make('div', 'controls_magnifier_button');
    btn.smallA = btn.dom.append('span', 'controls_magnifier_a', { text: 'A' });
    btn.largeA = btn.dom.append('span', 'controls_magnifier_A', { text: 'A' });
    p.buttons.push(btn);
    Monocle.Events.listenForTap(btn, toggleMagnification);
    return btn;
  }


  function toggleMagnification(evt) {
    var opacities;
    if (!p.sheetIndex) {
      opacities = [0.3, 1]
      var reset = k.RESET_STYLESHEET;
      reset += "html body { font-size: "+k.MAGNIFICATION*100+"% !important; }";
      p.sheetIndex = p.reader.addPageStyles(reset);
    } else {
      opacities = [1, 0.3]
      p.reader.removePageStyles(p.sheetIndex);
      p.sheetIndex = null;
    }

    for (var i = 0; i < p.buttons.length; i++) {
      p.buttons[i].smallA.style.opacity = opacities[0];
      p.buttons[i].largeA.style.opacity = opacities[1];
    }
  }

  API.createControlElements = createControlElements;

  initialize();

  return API;
}


Monocle.Controls.Magnifier.MAGNIFICATION = 1.15;

// NB: If you don't like the reset, you could set this to an empty string.
Monocle.Controls.Magnifier.RESET_STYLESHEET =
  "html, body, div, span," +
  //"h1, h2, h3, h4, h5, h6, " +
  "p, blockquote, pre," +
  "abbr, address, cite, code," +
  "del, dfn, em, img, ins, kbd, q, samp," +
  "small, strong, sub, sup, var," +
  "b, i," +
  "dl, dt, dd, ol, ul, li," +
  "fieldset, form, label, legend," +
  "table, caption, tbody, tfoot, thead, tr, th, td," +
  "article, aside, details, figcaption, figure," +
  "footer, header, hgroup, menu, nav, section, summary," +
  "time, mark " +
  "{ font-size: 100% !important; }" +
  "h1 { font-size: 2em !important }" +
  "h2 { font-size: 1.8em !important }" +
  "h3 { font-size: 1.6em !important }" +
  "h4 { font-size: 1.4em !important }" +
  "h5 { font-size: 1.2em !important }" +
  "h6 { font-size: 1.0em !important }";

Monocle.pieceLoaded('controls/magnifier');
