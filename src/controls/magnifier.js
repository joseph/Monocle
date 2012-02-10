Monocle.Controls.Magnifier = function (reader) {

  var API = { constructor: Monocle.Controls.Magnifier }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    buttons: [],
    magnified: false
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
    p.magnified = !p.magnified;
    if (p.magnified) {
      opacities = [0.3, 1];
      p.reader.formatting.setFontScale(k.MAGNIFICATION, true);
    } else {
      opacities = [1, 0.3];
      p.reader.formatting.setFontScale(null, true);
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


Monocle.Controls.Magnifier.MAGNIFICATION = 1.2;
