Carlyle.Controls.Magnifier = function (reader) {
  if (Carlyle.Controls == this) {
    return new Carlyle.Controls.Magnifier(reader);
  }

  // Constants.
  var k = {
  }

  // Properties.
  var p = {
    buttons: []
  }

  // Public methods and properties.
  var API = {
    constructor: Carlyle.Controls.Magnifier,
    constants: k,
    properties: p
  }


  function initialize() {
    p.reader = reader;
  }


  function createControlElements() {
    var btn = document.createElement('div');
    btn.style.cssText = Carlyle.Styles.ruleText(
      Carlyle.Styles.Controls.Magnifier.button
    );
    btn.smallA = document.createElement('span');
    btn.smallA.style.cssText = Carlyle.Styles.ruleText(
      Carlyle.Styles.Controls.Magnifier.smallA
    )
    btn.appendChild(btn.smallA);
    btn.largeA = document.createElement('span');
    btn.largeA.style.cssText = Carlyle.Styles.ruleText(
      Carlyle.Styles.Controls.Magnifier.largeA
    )
    btn.largeA.innerHTML = btn.smallA.innerHTML = "A";
    btn.appendChild(btn.largeA);

    var evtType = typeof Touch == "object" ? "touchstart" : "mousedown";
    Carlyle.addListener(btn, evtType, toggleMagnification, true);

    p.buttons.push(btn);
    return btn;
  }


  function toggleMagnification(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    var s = reader.properties.divs.pages[0].contentDiv.style;
    if (!s['font-size'] || s['font-size'] == "100%") {
      Carlyle.Styles.content['font-size'] = "110%";
      for (var i = 0; i < p.buttons.length; i++) {
        p.buttons[i].smallA.style.opacity = "0.3";
        p.buttons[i].largeA.style.opacity = "1";
      }
    } else {
      Carlyle.Styles.content['font-size'] = "100%";
      for (var i = 0; i < p.buttons.length; i++) {
        p.buttons[i].smallA.style.opacity = "1";
        p.buttons[i].largeA.style.opacity = "0.3";
      }
    }
    p.reader.reapplyStyles();
  }

  API.createControlElements = createControlElements;

  initialize();

  return API;
}


Carlyle.Styles.Controls.Magnifier = {
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
