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
    if (Monocle.Browser.has.touch) {
      Monocle.Events.listen(document.body, 'touchend', end);
    }
    return p.div;
  }


  function listenTo(evtCallbacks) {
    p.evtCallbacks = evtCallbacks;
  }


  function deafen() {
    p.evtCallbacks = {}
  }


  function start(evt) {
    if (Monocle.Browser.has.iframeTouchBug) {
      if (p.contact && p.proxiedContact != evt.proxied) { return; }
      p.proxiedContact = evt.proxied;
    }
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
