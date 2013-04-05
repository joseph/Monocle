Gala = {}


// Register an event listener.
//
Gala.listen = function (elem, evtType, fn, useCapture) {
  elem = Gala.$(elem);
  if (elem.addEventListener) {
    elem.addEventListener(evtType, fn, useCapture || false);
  } else if (elem.attachEvent) {
    if (evtType.indexOf(':') < 1) {
      elem.attachEvent('on'+evtType, fn);
    } else {
      var h = (Gala.IE_REGISTRATIONS[elem] = Gala.IE_REGISTRATIONS[elem] || {});
      var a = (h[evtType] = h[evtType] || []);
      a.push(fn);
    }
  }
}


// Remove an event listener.
//
Gala.deafen = function (elem, evtType, fn, useCapture) {
  elem = Gala.$(elem);
  if (elem.removeEventListener) {
    elem.removeEventListener(evtType, fn, useCapture || false);
  } else if (elem.detachEvent) {
    if (evtType.indexOf(':') < 1) {
      elem.detachEvent('on'+evtType, fn);
    } else {
      var h = (Gala.IE_REGISTRATIONS[elem] = Gala.IE_REGISTRATIONS[elem] || {});
      var a = (h[evtType] = h[evtType] || []);
      for (var i = 0, ii = a.length; i < ii; ++i) {
        if (a[i] == fn) { a.splice(i, 1); }
      }
    }
  }
}


// Fire an event on the element.
//
// The data supplied to this function will be available in the event object in
// the 'm' property -- eg, alert(evt.m) --> 'foo'
//
Gala.dispatch = function (elem, evtType, data, cancelable) {
  elem = Gala.$(elem);
  if (elem.dispatchEvent) {
    var evt = document.createEvent('Events');
    evt.initEvent(evtType, false, cancelable || false);
    evt.m = data;
    return elem.dispatchEvent(evt);
  } else if (elem.attachEvent && evtType.indexOf(':') >= 0) {
    if (!Gala.IE_REGISTRATIONS[elem]) { return true; }
    var evtHandlers = Gala.IE_REGISTRATIONS[elem][evtType];
    if (!evtHandlers || evtHandlers.length < 1) { return true; }
    var evt = {
      type: evtType,
      currentTarget: elem,
      target: elem,
      m: data,
      defaultPrevented: false,
      preventDefault: function () { evt.defaultPrevented = true; }
    }
    var q, processQueue = Gala.IE_INVOCATION_QUEUE.length == 0;
    for (var i = 0, ii = evtHandlers.length; i < ii; ++i) {
      q = { elem: elem, evtType: evtType, handler: evtHandlers[i], evt: evt }
      Gala.IE_INVOCATION_QUEUE.push(q);
    }
    if (processQueue) {
      while (q = Gala.IE_INVOCATION_QUEUE.shift()) {
        //console.log("IE EVT on %s: '%s' with data: %s", q.elem, q.evtType, q.evt.m);
        q.handler(q.evt);
      }
    }
    return !(cancelable && evt.defaultPrevented);
  } else {
    console.warn('[GALA] Cannot dispatch non-namespaced events: '+evtType);
    return true;
  }
}


// Prevents the browser-default action on an event and stops it from
// propagating up the DOM tree.
//
Gala.stop = function (evt) {
  evt = evt || window.event;
  if (evt.preventDefault) { evt.preventDefault(); }
  if (evt.stopPropagation) { evt.stopPropagation(); }
  evt.returnValue = false;
  evt.cancelBubble = true;
  return false;
}


// Add a group of listeners, which is just a hash of { evtType: callback, ... }
//
Gala.listenGroup = function (elem, listeners, useCapture) {
  for (evtType in listeners) {
    Gala.listen(elem, evtType, listeners[evtType], useCapture || false);
  }
}


// Remove a group of listeners.
//
Gala.deafenGroup = function (elem, listeners, useCapture) {
  for (evtType in listeners) {
    Gala.deafen(elem, evtType, listeners[evtType], useCapture || false);
  }
}


// Replace a group of listeners with another group, re-using the same
// 'listeners' object -- a common pattern.
//
Gala.replaceGroup = function (elem, listeners, newListeners, useCapture) {
  Gala.deafenGroup(elem, listeners, useCapture || false);
  for (evtType in listeners) { delete listeners[evtType]; }
  for (evtType in newListeners) { listeners[evtType] = newListeners[evtType]; }
  Gala.listenGroup(elem, listeners, useCapture || false);
  return listeners;
}


// Listen for a tap or a click event.
//
// Returns a 'listener' object that can be passed to Gala.deafenGroup().
//
// If 'tapClass' is undefined, it defaults to 'tapping'. If it is a blank
// string, no class is assigned.
//
Gala.onTap = function (elem, fn, tapClass) {
  elem = Gala.$(elem);
  if (typeof tapClass == 'undefined') { tapClass = Gala.TAPPING_CLASS; }
  var tapping = false;
  var fns = {
    start: function (evt) {
      tapping = true;
      if (tapClass) { elem.classList.add(tapClass); }
    },
    move: function (evt) {
      if (!tapping) { return; }
      tapping = false;
      if (tapClass) { elem.classList.remove(tapClass); }
    },
    end: function (evt) {
      if (!tapping) { return; }
      fns.move(evt);
      evt.currentTarget = evt.currentTarget || evt.srcElement;
      fn(evt);
    },
    noop: function (evt) {}
  }
  var noopOnClick = function (listeners) {
    Gala.listen(elem, 'click', listeners.click = fns.noop);
  }
  Gala.listen(window, 'gala:contact:cancel', fns.move);
  return Gala.onContact(elem, fns, false, noopOnClick);
}


// Register a series of functions to listen for the start, move, end
// events of a mouse or touch interaction.
//
// 'fns' argument is an object like:
//
//   {
//     'start': function () { ... },
//     'move': function () { ... },
//     'end': function () { ... },
//     'cancel': function () { ... }
//   }
//
// All of the functions in this object are optional.
//
// Returns an object that can later be passed to Gala.deafenGroup.
//
Gala.onContact = function (elem, fns, useCapture, initCallback) {
  elem = Gala.$(elem);
  var listeners = null;
  var inited = false;

  // If we see a touchstart event, register all these listeners.
  var touchListeners = function () {
    var l = {}
    if (fns.start) {
      l.touchstart = function (evt) {
        if (evt.touches.length <= 1) { fns.start(evt); }
      }
    }
    if (fns.move) {
      l.touchmove = function (evt) {
        if (evt.touches.length <= 1) { fns.move(evt); }
      }
    }
    if (fns.end) {
      l.touchend = function (evt) {
        if (evt.touches.length <= 1) { fns.end(evt); }
      }
    }
    if (fns.cancel) {
      l.touchcancel = fns.cancel;
    }
    return l;
  }

  // Whereas if we see a mousedown event, register all these listeners.
  var mouseListeners = function () {
    var l = {};
    if (fns.start) {
      l.mousedown = function (evt) { if (evt.button < 2) { fns.start(evt); } }
    }
    if (fns.move) {
      l.mousemove = fns.move;
    }
    if (fns.end) {
      l.mouseup = function (evt) { if (evt.button < 2) { fns.end(evt); } }
    }
    // if (fns.cancel) {
    //   l.mouseout = function (evt) {
    //     obj = evt.relatedTarget || evt.fromElement;
    //     while (obj && (obj = obj.parentNode)) { if (obj == elem) { return; } }
    //     fns.cancel(evt);
    //   }
    // }
    return l;
  }

  if (typeof Gala.CONTACT_MODE == 'undefined') {
    var contactInit = function (evt, newListeners, mode) {
      if (inited) { return; }
      Gala.CONTACT_MODE = Gala.CONTACT_MODE || mode;
      if (Gala.CONTACT_MODE != mode) { return; }
      Gala.replaceGroup(elem, listeners, newListeners, useCapture);
      if (typeof initCallback == 'function') { initCallback(listeners); }
      if (listeners[evt.type]) { listeners[evt.type](evt); }
      inited = true;
    }
    var touchInit = function (evt) {
      contactInit(evt, touchListeners(), 'touch');
    }
    var mouseInit = function (evt) {
      contactInit(evt, mouseListeners(), 'mouse');
    }
    listeners = {
      'touchstart': touchInit,
      'touchmove': touchInit,
      'touchend': touchInit,
      'touchcancel': touchInit,
      'mousedown': mouseInit,
      'mousemove': mouseInit,
      'mouseup': mouseInit,
      'mouseout': mouseInit
    }
  } else if (Gala.CONTACT_MODE == 'touch') {
    listeners = touchListeners();
  } else if (Gala.CONTACT_MODE == 'mouse') {
    listeners = mouseListeners();
  }

  Gala.listenGroup(elem, listeners);
  if (typeof initCallback == 'function') { initCallback(listeners); }
  return listeners;
}


// The Gala.Cursor object provides more detail coordinates for the contact
// event, and normalizes differences between touch and mouse coordinates.
//
// If you have a contact event listener, you can get the coordinates for it
// with:
//
//    var cursor = new Gala.Cursor(evt);
//
Gala.Cursor = function (evt) {
  var API = { constructor: Gala.Cursor }


  function initialize() {
    var ci =
      evt.type.indexOf('mouse') == 0 ? evt :
      ['touchstart', 'touchmove'].indexOf(evt.type) >= 0 ? evt.targetTouches[0] :
      ['touchend', 'touchcancel'].indexOf(evt.type) >= 0 ? evt.changedTouches[0] :
      null;

    // Basic coordinates (provided by the event).
    API.pageX = ci.pageX;
    API.pageY = ci.pageY;
    API.clientX = ci.clientX;
    API.clientY = ci.clientY;
    API.screenX = ci.screenX;
    API.screenY = ci.screenY;

    // Coordinates relative to the target element for the event.
    var tgt = API.target = evt.target || evt.srcElement;
    while (tgt.nodeType != 1 && tgt.parentNode) { tgt = tgt.parentNode; }
    assignOffsetFor(tgt, 'offset');

    // Coordinates relative to the element that the event was registered on.
    var registrant = evt.currentTarget;
    if (registrant && typeof registrant.offsetLeft != 'undefined') {
      assignOffsetFor(registrant, 'registrant');
    }
  }


  function assignOffsetFor(elem, attr) {
    var r;
    if (elem.getBoundingClientRect) {
      var er = elem.getBoundingClientRect();
      var dr = document.documentElement.getBoundingClientRect();
      r = { left: er.left - dr.left, top: er.top - dr.top }
    } else {
      r = { left: elem.offsetLeft, top: elem.offsetTop }
      while (elem = elem.offsetParent) {
        if (elem.offsetLeft || elem.offsetTop) {
          r.left += elem.offsetLeft;
          r.top += elem.offsetTop;
        }
      }
    }
    API[attr+'X'] = API.pageX - r.left;
    API[attr+'Y'] = API.pageY - r.top;
  }


  initialize();

  return API;
}


// A little utility to dereference ids into elements. You've seen this before.
//
Gala.$ = function (elem) {
  if (typeof elem == 'string') { elem = document.getElementById(elem); }
  return elem;
}



// CONSTANTS
//
Gala.TAPPING_CLASS = 'tapping';
Gala.IE_REGISTRATIONS = {}
Gala.IE_INVOCATION_QUEUE = []
