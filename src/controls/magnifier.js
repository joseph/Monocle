Monocle.Controls.Magnifier = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Magnifier(reader);
  }

  // Public methods and properties.
  var API = { constructor: Monocle.Controls.Magnifier }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    buttons: [],
    enlarged: false
  }


  function initialize() {
    p.reader = reader;
  }


  function createControlElements(holder) {
    var btn = holder.dom.make('div', 'controls_magnifier_button');
    btn.smallA = btn.dom.append('span', 'controls_magnifier_a', { text: 'A' });
    btn.largeA = btn.dom.append('span', 'controls_magnifier_A', { text: 'A' });
    p.buttons.push(btn);
    Monocle.Events.listenForContact(btn, { start: toggleMagnification });
    return btn;
  }


  function toggleMagnification(evt) {
    if (evt.preventDefault) {
      evt.preventDefault();
      evt.stopPropagation();
    } else {
      evt.returnValue = false;
    }
    var opacities;
    if (!p.enlarged) {
      Monocle.Styles.body['font-size'] = k.LARGE_FONT_SIZE;
      opacities = [0.3, 1]
      p.enlarged = true;
    } else {
      Monocle.Styles.body['font-size'] = k.NORMAL_FONT_SIZE;
      opacities = [1, 0.3]
      p.enlarged = false;
    }

    for (var i = 0; i < p.buttons.length; i++) {
      p.buttons[i].smallA.style.opacity = opacities[0];
      p.buttons[i].largeA.style.opacity = opacities[1];
    }

    p.reader.reapplyStyles();

    // Reapplying styles may hide overlay. FIXME: this could be done more
    // delicately...
    //p.ctrlHolder.parentNode.style.display = "block";
  }

  API.createControlElements = createControlElements;

  initialize();

  return API;
}

Monocle.Controls.Magnifier.LARGE_FONT_SIZE = "115%";
Monocle.Controls.Magnifier.NORMAL_FONT_SIZE = "100%";
Monocle.pieceLoaded('controls/magnifier');
