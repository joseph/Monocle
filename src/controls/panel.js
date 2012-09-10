// A panel is an invisible column of interactivity. When contact occurs
// (mousedown, touchstart), the panel expands to the full width of its
// container, to catch all interaction events and prevent them from hitting
// other things.
//
// Panels are used primarily to provide hit zones for page flipping
// interactions, but you can do whatever you like with them.
//
// After instantiating a panel and adding it to the reader as a control,
// you can call listenTo() with a hash of methods for any of 'start', 'move'
// 'end' and 'cancel'.
//
Monocle.Controls.Panel = function () {

  var API = { constructor: Monocle.Controls.Panel }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    evtCallbacks: {}
  }

  function createControlElements(cntr) {
    p.div = cntr.dom.make('div', k.CLS.panel);
    p.div.dom.setStyles(k.DEFAULT_STYLES);
    Monocle.Events.listenForContact(
      p.div,
      {
        'start': start,
        'move': move,
        'end': end,
        'cancel': cancel
      },
      { useCapture: false }
    );
    return p.div;
  }


  function setDirection(dir) {
    p.direction = dir;
  }


  function listenTo(evtCallbacks) {
    p.evtCallbacks = evtCallbacks;
  }


  function deafen() {
    p.evtCallbacks = {}
  }


  function start(evt) {
    p.contact = true;
    evt.m.offsetX += p.div.offsetLeft;
    evt.m.offsetY += p.div.offsetTop;
    expand();
    invoke('start', evt);
  }


  function move(evt) {
    if (!p.contact) {
      return;
    }
    invoke('move', evt);
  }


  function end(evt) {
    if (!p.contact) {
      return;
    }
    Monocle.Events.deafenForContact(p.div, p.listeners);
    contract();
    p.contact = false;
    invoke('end', evt);
  }


  function cancel(evt) {
    if (!p.contact) {
      return;
    }
    Monocle.Events.deafenForContact(p.div, p.listeners);
    contract();
    p.contact = false;
    invoke('cancel', evt);
  }


  function invoke(evtType, evt) {
    if (p.evtCallbacks[evtType]) {
      p.evtCallbacks[evtType](p.direction, evt.m.offsetX, evt.m.offsetY, API);
    }
    evt.preventDefault();
  }


  function expand() {
    if (p.expanded) {
      return;
    }
    p.div.dom.addClass(k.CLS.expanded);
    p.expanded = true;
  }


  function contract(evt) {
    if (!p.expanded) {
      return;
    }
    p.div.dom.removeClass(k.CLS.expanded);
    p.expanded = false;
  }


  API.createControlElements = createControlElements;
  API.listenTo = listenTo;
  API.deafen = deafen;
  API.expand = expand;
  API.contract = contract;
  API.setDirection = setDirection;

  return API;
}


Monocle.Controls.Panel.CLS = {
  panel: 'panel',
  expanded: 'controls_panel_expanded'
}
Monocle.Controls.Panel.DEFAULT_STYLES = {
  position: 'absolute',
  height: '100%'
}
