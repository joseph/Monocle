Monocle.Controls.Panel = function () {

  var API = { constructor: Monocle.Controls.Panel }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    evtCallbacks: {}
  }

  function createControlElements(cntr) {
    p.div = document.createElement('div');
    p.div.style.cssText = "position: absolute; height: 100%;";
    Monocle.Events.listenForContact(p.div, { 'start': start });
    return p.div;
  }


  function listenTo(evtCallbacks) {
    p.evtCallbacks = evtCallbacks;
  }


  function start(evt) {
    if (p.contacted) {
      cancel(evt);
      return;
    }
    p.contacted = true;
    evt.m.offsetX += p.div.offsetLeft;
    evt.m.offsetY += p.div.offsetTop;
    expand();
    p.listeners = Monocle.Events.listenForContact(
      p.div,
      {
        'move': move,
        'end': end,
        'cancel': cancel
      }
    );
    invoke('start', evt);
  }


  function move(evt) {
    invoke('move', evt);
  }


  function end(evt) {
    Monocle.Events.deafenForContact(p.div, p.listeners);
    contract();
    p.contacted = false;
    invoke('end', evt);
  }


  function cancel(evt) {
    Monocle.Events.deafenForContact(p.div, p.listeners);
    contract();
    p.contacted = false;
    invoke('cancel', evt);
  }


  function invoke(evtType, evt) {
    if (p.evtCallbacks[evtType]) {
      p.evtCallbacks[evtType](API, evt.m.offsetX, evt.m.offsetY);
    }
    evt.preventDefault();
  }


  function expand() {
    p.css = p.div.style.cssText;
    p.div.style.left = 0;
    p.div.style.width = "100%";
    p.div.style.zIndex = 1001;
  }


  function contract(evt) {
    p.div.style.cssText = p.css;
  }


  API.createControlElements = createControlElements;
  API.listenTo = listenTo;

  return API;
}
