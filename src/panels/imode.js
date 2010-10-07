// A three-pane system of page interaction. The left 33% turns backwards, the
// right 33% turns forwards, and contact on the middle third causes the
// system to go into "interactive mode". In this mode, the page-flipping panels
// are only active in the margins, and all of the actual text content of the
// book is selectable. The user can exit "interactive mode" by hitting the little
// IMode icon in the lower right corner of the reader.
//
Monocle.Panels.IMode = function (flipper, evtCallbacks) {

  var API = { constructor: Monocle.Panels.IMode }
  var k = API.constants = API.constructor;
  var p = API.properties = {}


  function initialize() {
    p.flipper = flipper;
    p.reader = flipper.properties.reader;
    p.panels = {
      forwards: new Monocle.Controls.Panel(),
      backwards: new Monocle.Controls.Panel()
    }
    p.divs = {}

    for (dir in p.panels) {
      p.reader.addControl(p.panels[dir]);
      p.divs[dir] = p.panels[dir].properties.div;
      p.panels[dir].listenTo(evtCallbacks);
      p.panels[dir].properties.direction = flipper.constants[dir.toUpperCase()];
      p.divs[dir].style.width = "33%";
      p.divs[dir].style[dir == "forwards" ? "right" : "left"] = 0;
    }

    p.panels.central = new Monocle.Controls.Panel();
    p.reader.addControl(p.panels.central);
    p.divs.central = p.panels.central.properties.div;
    p.divs.central.dom.setStyles({ left: "33%", width: "34%" });
    menuCallbacks({ end: modeOn });

    for (dir in p.panels) {
      p.divs[dir].dom.addClass('panels_imode_panel');
      p.divs[dir].dom.addClass('panels_imode_'+dir+'Panel');
    }

    p.toggleIcon = {
      createControlElements: function (cntr) {
        var div = cntr.dom.make('div', 'panels_imode_toggleIcon');
        Monocle.Events.listenForTap(div, modeOff);
        return div;
      }
    }
    p.reader.addControl(p.toggleIcon, null, { hidden: true });
  }


  function menuCallbacks(callbacks) {
    p.menuCallbacks = callbacks;
    p.panels.central.listenTo(p.menuCallbacks);
  }


  function toggle() {
    p.interactive ? modeOff() : modeOn();
  }


  function modeOn() {
    if (p.interactive) {
      return;
    }

    p.panels.central.contract();

    var page = p.reader.visiblePages()[0];
    var sheaf = page.m.sheafDiv;
    var bw = sheaf.offsetLeft;
    var fw = page.offsetWidth - (sheaf.offsetLeft + sheaf.offsetWidth);
    bw = Math.floor(((bw - 2) / page.offsetWidth) * 10000 / 100 ) + "%";
    fw = Math.floor(((fw - 2) / page.offsetWidth) * 10000 / 100 ) + "%";

    startCameo(function () {
      p.divs.forwards.style.width = fw;
      p.divs.backwards.style.width = bw;
      Monocle.Styles.affix(p.divs.central, 'transform', 'translateY(-100%)');
    });

    p.reader.showControl(p.toggleIcon);

    p.interactive = true;
    if (flipper.interactiveMode) {
      flipper.interactiveMode(true);
    }
  }


  function modeOff() {
    if (!p.interactive) {
      return;
    }

    p.panels.central.contract();

    deselect();

    startCameo(function () {
      p.divs.forwards.style.width = "33%";
      p.divs.backwards.style.width = "33%";
      Monocle.Styles.affix(p.divs.central, 'transform', 'translateY(0)');
    });

    p.reader.hideControl(p.toggleIcon);

    p.interactive = false;
    if (flipper.interactiveMode) {
      flipper.interactiveMode(false);
    }
  }


  function startCameo(fn) {
    // Set transitions on the panels.
    var trn = Monocle.Panels.IMode.CAMEO_DURATION+"ms ease-in";
    Monocle.Styles.affix(p.divs.forwards, 'transition', "width "+trn);
    Monocle.Styles.affix(p.divs.backwards, 'transition', "width "+trn);
    Monocle.Styles.affix(p.divs.central, 'transition', "-webkit-transform "+trn);

    // Temporarily disable listeners.
    for (var pan in p.panels) {
      p.panels[pan].deafen();
    }

    // Set the panels to opaque.
    for (var div in p.divs) {
      p.divs[div].style.opacity = 1;
    }

    if (typeof WebkitTransitionEvent != "undefined") {
      p.cameoListener = Monocle.Events.listen(
        p.divs.central,
        'webkitTransitionEnd',
        endCameo
      );
    } else {
      setTimeout(endCameo, k.CAMEO_DURATION);
    }
    fn();
  }


  function endCameo() {
    setTimeout(function () {
      // Remove panel transitions.
      var trn = "opacity linear " + Monocle.Panels.IMode.LINGER_DURATION + "ms";
      Monocle.Styles.affix(p.divs.forwards, 'transition', trn);
      Monocle.Styles.affix(p.divs.backwards, 'transition', trn);
      Monocle.Styles.affix(p.divs.central, 'transition', trn);

      // Set the panels to transparent.
      for (var div in p.divs) {
        p.divs[div].style.opacity = 0;
      }

      // Re-enable listeners.
      p.panels.forwards.listenTo(evtCallbacks);
      p.panels.backwards.listenTo(evtCallbacks);
      p.panels.central.listenTo(p.menuCallbacks);
    }, Monocle.Panels.IMode.LINGER_DURATION);


    if (p.cameoListener) {
      Monocle.Events.deafen(p.divs.central, 'webkitTransitionEnd', endCameo);
    }
  }


  function deselect() {
    for (var i = 0, cmpt; cmpt = p.reader.dom.find('component', i); ++i) {
      var sel = cmpt.contentWindow.getSelection() || cmpt.contentDocument.selection;
      //if (sel.collapse) { sel.collapse(true); }
      if (sel.removeAllRanges) { sel.removeAllRanges(); }
      if (sel.empty) { sel.empty(); }
      cmpt.contentDocument.body.scrollLeft = 0;
      cmpt.contentDocument.body.scrollTop = 0;
    }
  }


  API.toggle = toggle;
  API.modeOn = modeOn;
  API.modeOff = modeOff;
  API.menuCallbacks = menuCallbacks;

  initialize();

  return API;
}

Monocle.Panels.IMode.CAMEO_DURATION = 250;
Monocle.Panels.IMode.LINGER_DURATION = 250;

Monocle.pieceLoaded('panels/imode');
