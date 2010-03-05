Monocle.Controls.Magnifier = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Magnifier(reader);
  }

  // Constants.
  var k = {
    LARGE_FONT_SIZE: "115%",
    NORMAL_FONT_SIZE: Monocle.Styles.content['font-size'] || "100%"
  }

  // Properties.
  var p = {
    buttons: [],
    enlarged: false
  }

  // Public methods and properties.
  var API = {
    constructor: Monocle.Controls.Magnifier,
    constants: k,
    properties: p
  }


  function initialize() {
    p.reader = reader;
  }


  function createControlElements() {
    var btn = document.createElement('div');
    btn.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Magnifier.button
    );
    btn.smallA = document.createElement('span');
    btn.smallA.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Magnifier.smallA
    )
    btn.appendChild(btn.smallA);
    btn.largeA = document.createElement('span');
    btn.largeA.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Magnifier.largeA
    )
    btn.largeA.innerHTML = btn.smallA.innerHTML = "A";
    btn.appendChild(btn.largeA);

    var evtType = typeof Touch == "object" ? "touchstart" : "mousedown";
    Monocle.addListener(btn, evtType, toggleMagnification, true);

    p.buttons.push(btn);
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
      Monocle.Styles.content['font-size'] = k.LARGE_FONT_SIZE;
      opacities = [0.3, 1]
      p.enlarged = true;
    } else {
      Monocle.Styles.content['font-size'] = k.NORMAL_FONT_SIZE;
      opacities = [1, 0.3]
      p.enlarged = false;
    }

    for (var i = 0; i < p.buttons.length; i++) {
      p.buttons[i].smallA.style.opacity = opacities[0];
      p.buttons[i].largeA.style.opacity = opacities[1];
    }

    p.reader.reapplyStyles();
  }

  API.createControlElements = createControlElements;

  initialize();

  return API;
}


Monocle.Styles.Controls.Magnifier = {
  button: {
    "cursor": "pointer",
    "color": "#555",
    "position": "absolute",
    "top": "2px",
    "right": "10px",
    "padding": "0 2px"
  },
  largeA: {
    "font-size": "18px",
    "opacity": "0.3"
  },
  smallA: {
    "font-size": "11px"
  }
}
