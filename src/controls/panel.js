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
    p.div = document.createElement('div');
    p.div.style.cssText = "position: absolute; height: 100%;";
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


  function listenTo(evtCallbacks) {
    p.evtCallbacks = evtCallbacks;
  }


  function deafen() {
    p.evtCallbacks = {}
  }


  function start(evt) {
    p.contact = true;
    if (evt.m) {
      evt.m.offsetX += p.div.offsetLeft;
      evt.m.offsetY += p.div.offsetTop;
    } else if (typeof evt.offsetX != 'undefined') {
      evt.m = evt.monocleData = {
        offsetX: evt.offsetX + p.div.offsetLeft,
        offsetY: evt.offsetY + p.div.offsetTop
      }
    }
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
      if (!evt.m) {
        evt.m = evt.monocleData = {
          offsetX: evt.offsetX,
          offsetY: evt.offsetY
        }
      }
      p.evtCallbacks[evtType](API, evt.m.offsetX, evt.m.offsetY);
    }
    evt.preventDefault();
  }


  function expand() {
    if (p.expanded) {
      return;
    }
    p.contractData = {
      left: p.div.style.left,
      width: p.div.style.width,
      zIndex: p.div.style.zIndex
    }
    p.css = p.div.style.cssText;
    p.div.style.left = 0;
    p.div.style.width = "100%";
    p.div.style.zIndex = 1001;
    p.expanded = true;
  }


  function contract(evt) {
    if (!p.expanded) {
      return;
    }
    for (n in p.contractData) {
      p.div.style[n] = p.contractData[n];
    }
    p.expanded = false;
  }


  API.createControlElements = createControlElements;
  API.listenTo = listenTo;
  API.deafen = deafen;
  API.expand = expand;
  API.contract = contract;

  return API;
}

Monocle.pieceLoaded('controls/panel');
