Monocle.Panels.Magic = function (flipper, evtCallbacks) {

  var API = { constructor: Monocle.Panels.Magic }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    flipper: flipper,
    evtCallbacks: evtCallbacks,
    parts: {},
    action: {},
    contacts: [],
    startListeners: [],
    disabled: false
  }


  function initialize() {
    p.reader = flipper.properties.reader;
    p.parts = {
      reader: p.reader.dom.find('box'),
      cmpts: []
    }
    for (var i = 0; i < p.flipper.pageCount; ++i) {
      p.parts.cmpts.push(p.reader.dom.find('component', i));
    }
    initListeners();

    p.reader.listen('monocle:componentmodify', initListeners);
    p.reader.listen('monocle:magic:init', initListeners);
    p.reader.listen('monocle:magic:halt', haltListeners);
    p.reader.listen('monocle:modal:on', disable);
    p.reader.listen('monocle:modal:off', enable);
  }


  function initListeners(evt) {
    //console.log('magic:init');
    stopListening();
    startListening();
  }


  function haltListeners(evt) {
    //console.log('magic:halt');
    stopListening();
  }


  function disable(evt) {
    //console.log('modal:on - halting magic');
    stopListening();
    p.disabled = true;
  }


  function enable(evt) {
    //console.log('modal:off - initing magic');
    p.disabled = false;
    startListening();
  }


  function startListening() {
    if (p.disabled || p.startListeners.length) { return; }

    p.startListeners.push([
      p.parts.reader,
      Monocle.Events.listenForContact(
        p.parts.reader,
        { 'start': translatorFunction(p.parts.reader, readerContactStart) }
      )
    ]);

    for (var i = 0, ii = p.parts.cmpts.length; i < ii; ++i) {
      p.startListeners.push([
        p.parts.cmpts[i].contentDocument.defaultView,
        Monocle.Events.listenForContact(
          p.parts.cmpts[i].contentDocument.defaultView,
          { 'start': translatorFunction(p.parts.cmpts[i], cmptContactStart) }
        )
      ]);
    }
  }


  function stopListening() {
    if (p.disabled || !p.startListeners.length) { return; }
    for (var j = 0, jj = p.startListeners.length; j < jj; ++j) {
      Monocle.Events.deafenForContact(
        p.startListeners[j][0],
        p.startListeners[j][1]
      );
    }
    p.startListeners = [];
  }


  function listenForMoveAndEnd(fnMove, fnEnd) {
    listenOnElem(
      document.defaultView,
      translatorFunction(document.documentElement, fnMove),
      translatorFunction(document.documentElement, fnEnd)
    );
    for (var i = 0, ii = p.parts.cmpts.length; i < ii; ++i) {
      listenOnElem(
        p.parts.cmpts[i].contentDocument.defaultView,
        translatorFunction(p.parts.cmpts[i], fnMove),
        translatorFunction(p.parts.cmpts[i], fnEnd)
      );
    }
  }


  function listenOnElem(elem, fnMove, fnEnd) {
    var contactListeners = Monocle.Events.listenForContact(
      elem,
      {
        'move': fnMove,
        'end': function (evt) { deafenContactListeners(); fnEnd(evt); }
      }
    );
    p.contacts.push([elem, contactListeners]);
  }


  function deafenContactListeners() {
    for (var i = 0, ii = p.contacts.length; i < ii; ++i) {
      Monocle.Events.deafenForContact(p.contacts[i][0], p.contacts[i][1]);
    }
    p.contacts = [];
  }


  function readerContactStart(evt) {
    listenForMoveAndEnd(readerContactMove, readerContactEnd);
    p.action.startX = evt.m.readerX;
    p.action.startY = evt.m.readerY;
    p.action.screenX = evt.m.screenX;
    p.action.screenY = evt.m.screenY;
    p.action.dir = evt.m.readerX > halfway() ? k.FORWARDS : k.BACKWARDS;
    invoke('start', evt);
  }


  function readerContactMove(evt) {
    invoke('move', evt);
    // Can't prevent mousemove, so has no effect there. Preventing default
    // for touchmove will override scrolling, while still allowing selection.
    evt.preventDefault();
  }


  function readerContactEnd(evt) {
    p.action.endX = evt.m.readerX;
    p.action.endY = evt.m.readerY;
    invoke('end', evt);
    p.action = {};
  }


  function cmptContactStart(evt) {
    if (actionIsCancelled(evt)) { return resetAction(); }
    p.action.startX = evt.m.readerX;
    p.action.startY = evt.m.readerY;
    p.action.screenX = evt.m.screenX;
    p.action.screenY = evt.m.screenY;
    listenForMoveAndEnd(cmptContactMove, cmptContactEnd);
  }


  function cmptContactMove(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }

    // Can't prevent mousemove, so has no effect there. Preventing default
    // for touchmove will override scrolling, while still allowing selection.
    evt.preventDefault();
  }


  function cmptContactEnd(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }
    p.action.endX = evt.m.readerX;
    p.action.endY = evt.m.readerY;
    if (Math.abs(p.action.endX - p.action.startX) < k.LEEWAY) {
      p.action.dir = p.action.startX > halfway() ? k.FORWARDS : k.BACKWARDS;
    } else {
      p.action.dir = p.action.startX > p.action.endX ? k.FORWARDS : k.BACKWARDS;
    }

    var rr = p.parts.reader.getBoundingClientRect();
    var evtData = {
      start: { x: p.action.startX, y: p.action.startY },
      end: { x: p.action.endX, y: p.action.endY },
      max: { x: rr.right - rr.left, y: rr.bottom - rr.top }
    }
    if (p.reader.dispatchEvent('monocle:magic:contact', evtData, true)) {
      invoke('start', evt);
      invoke('end', evt);
    }
    p.action = {};
  }


  // Adds two new properties to evt.m:
  // - readerX
  // - readerY
  //
  // Calculated as the offset of the click from the top left of reader element.
  //
  // Then calls the passed function.
  //
  function translatorFunction(registrant, callback) {
    return function (evt) {
      translatingReaderOffset(registrant, evt, callback);
    }
  }


  function translatingReaderOffset(registrant, evt, callback) {
    if (typeof p.action.screenX != 'undefined') {
      evt.m.readerX = p.action.startX + (evt.m.screenX - p.action.screenX);
      evt.m.readerY = p.action.startY + (evt.m.screenY - p.action.screenY);
    } else {
      var dr = document.documentElement.getBoundingClientRect();
      var rr = p.parts.reader.getBoundingClientRect();
      rr = { left: rr.left - dr.left, top: rr.top - dr.top }

      if (evt.view == window) {
        evt.m.readerX = Math.round(evt.m.pageX - rr.left);
        evt.m.readerY = Math.round(evt.m.pageY - rr.top);
      } else {
        var er = registrant.getBoundingClientRect();
        er = { left: er.left - dr.left, top: er.top - dr.top }
        evt.m.readerX = Math.round((er.left - rr.left) + evt.m.clientX);
        evt.m.readerY = Math.round((er.top - rr.top) + evt.m.clientY);
      }
    }

    callback(evt);
  }


  function halfway() {
    return p.parts.reader.offsetWidth / 2;
  }


  function resetAction() {
    p.action = {};
    deafenContactListeners();
  }


  function actionIsCancelled(evt) {
    var win = evt.target.ownerDocument.defaultView;
    return (evt.defaultPrevented || !win.getSelection().isCollapsed);
  }


  function actionIsEmpty() {
    return typeof p.action.startX == 'undefined';
  }


  function invoke(evtType, evt) {
    if (p.evtCallbacks[evtType]) {
      p.evtCallbacks[evtType](p.action.dir, evt.m.readerX, evt.m.readerY, API);
    }
  }


  API.enable = enable;
  API.disable = disable;

  initialize();

  return API;
}


Monocle.Panels.Magic.LEEWAY = 3;
Monocle.Panels.Magic.FORWARDS = 1;
Monocle.Panels.Magic.BACKWARDS = -1;
