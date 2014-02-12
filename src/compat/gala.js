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
  var evt;
  if (elem.dispatchEvent) {
    evt = document.createEvent('Events');
    evt.initEvent(evtType, false, cancelable || false);
    evt.m = data;
    return elem.dispatchEvent(evt);
  } else if (elem.attachEvent && evtType.indexOf(':') >= 0) {
    if (!Gala.IE_REGISTRATIONS[elem]) { return true; }
    var evtHandlers = Gala.IE_REGISTRATIONS[elem][evtType];
    if (!evtHandlers || evtHandlers.length < 1) { return true; }
    evt = {
      type: evtType,
      currentTarget: elem,
      target: elem,
      m: data,
      defaultPrevented: false,
      preventDefault: function () { evt.defaultPrevented = true; }
    }
    var q, processQueue = Gala.IE_INVOCATION_QUEUE.length === 0;
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
  for (var evtType in listeners) {
    Gala.listen(elem, evtType, listeners[evtType], useCapture || false);
  }
}


// Remove a group of listeners.
//
Gala.deafenGroup = function (elem, listeners, useCapture) {
  for (var evtType in listeners) {
    Gala.deafen(elem, evtType, listeners[evtType], useCapture || false);
  }
}


// Replace a group of listeners with another group, re-using the same
// 'listeners' object -- a common pattern.
//
Gala.replaceGroup = function (elem, listeners, newListeners, useCapture) {
  Gala.deafenGroup(elem, listeners, useCapture || false);
  for (var evtType in listeners) { delete listeners[evtType]; }
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
  // Throttle the invocation to prevent double firing of the event in envs
  // that support touch and mouse. Particularly in Firefox and Chrome on IE 8,
  // a mouse event and touch events are both fired.
  // Ref https://github.com/joseph/Monocle/pull/216#issuecomment-21424427
  fn = Gala.throttle(fn, 100);

  if (typeof tapClass == 'undefined') { tapClass = Gala.TAPPING_CLASS; }

  var tapStartingCoords = {};

  // If the tap extends beyond a few pixels, it's no longer a tap.
  var tapIsValid = function (evt) {
    var cur = Gala.Cursor(evt);
    var xDelta = Math.abs(cur.pageX - tapStartingCoords.x);
    var yDelta = Math.abs(cur.pageY - tapStartingCoords.y);
    var maxContact = Math.max(xDelta, yDelta);
    return Gala.TAP_MAX_CONTACT_DISTANCE >= maxContact;
  }

  // This ensures the element is considered 'clickable' by browsers
  // like on the Kindle 3.
  var noopOnClick = function (listeners) {
    Gala.listen(elem, 'click', listeners.click = fns.noop);
  }

  var fns = {
    start: function (evt) {
      var cur = Gala.Cursor(evt);
      tapStartingCoords = { x: cur.pageX, y: cur.pageY };
      if (tapClass) { elem.classList.add(tapClass); }
    },
    move: function (evt) {
      if (!tapStartingCoords) { return; }
      if (!tapIsValid(evt)) { fns.cancel(evt); }
    },
    end: function (evt) {
      if (!tapStartingCoords) { return; }
      fns.cancel(evt);
      evt.currentTarget = evt.currentTarget || evt.srcElement;
      fn(evt);
    },
    noop: function () {},
    cancel: function () {
      if (!tapStartingCoords) { return; }
      tapStartingCoords = null;
      if (tapClass) { elem.classList.remove(tapClass); }
    }
  };
  Gala.listen(window, Gala.CONTACT_CANCEL, fns.cancel);
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

  var isLeftClick = function (evt) {
    return evt[typeof evt.which == 'undefined' ? 'button' : 'which'] < 2;
  }

  var isSingleTouch = function (evt) {
    return !!(evt.touches && evt.touches.length < 2);
  }

  var wrapContact = function (fn) {
    return function (evt) {
      if (Gala.Pointers.enabled()) { Gala.Pointers.trackPointers(evt); }
      var doCallFunc = (Gala.Pointers.isSinglePointer() ||
        isSingleTouch(evt) ||
        isLeftClick(evt));
      if (doCallFunc) { fn(evt); }
    }
  }

  var buildListeners = function (opts) {
    var types = Gala.getEventTypes();

    var listeners = {};
    var evtTypes = ['start', 'move', 'end', 'cancel'];
    for (var i = 0, ii = evtTypes.length; i < ii; ++i) {
      var type = evtTypes[i];
      if (opts[type]) {
        var thisEvtTypes = types[type].split(' ');
        for (var j = 0, jj = thisEvtTypes.length; j < jj; ++j) {
          listeners[thisEvtTypes[j]] = wrapContact(opts[type]);
        }
      }
    }
    return listeners;
  }

  var listeners = buildListeners(fns);

  Gala.listenGroup(elem, listeners);
  if (typeof initCallback == 'function') { initCallback(listeners); }
  return listeners;
}

// Support for pointer events
// http://msdn.microsoft.com/en-us/library/ie/hh673557(v=vs.85).aspx
// http://www.w3.org/Submission/pointer-events/
// Primary target of this functionality is windows 8, surface, etc
//
Gala.Pointers = {
  pointers: {},


  enabled: function () {
    return Gala.Pointers.ENV.pointer || Gala.Pointers.ENV.msPointer;
  },

  // Track pointer events
  //
  trackPointers: function (evt) {
    var types = Gala.getEventTypes(),
    endEvents = types.end.slice().concat(types.cancel);

    // if we have an end event, I'm not sure it makes sense to only clear the
    // single pointer that sent the end event. I think it makes sense to
    // clear all pointers...I think it's kind of an edge case.
    if (endEvents.indexOf(evt.type)) {
      this.reset();
    } else {
      this.pointers[evt.pointerId] = evt;
    }
  },


  // This follows the same logic as touches. To be valid, there
  // is less than two.
  //
  isSinglePointer: function () {
    return !!(this.enabled() && this.count() < 2);
  },


  // Get count of currently tracked pointers
  //
  count: function () {
    // This method only exists in IE > 8 but that's ok because this code only
    // applies to versions of IE > 8;
    return Object.keys ? Object.keys(this.pointers).length : 0;
  },


  // Reset the pointers
  //
  reset: function () {
    this.pointers = {};
  }
}

Gala.Pointers.ENV = {
  // Is the Pointer Events specification implemented?
  // http://www.w3.org/Submission/pointer-events/
  // Not sure how I feel about this spec but it makes sense to unify
  // the events into a single interface to be used as needed. - DS
  //
  msPointer: (function () { return !!navigator.msPointerEnabled })(),


  pointer: (function () { return !!navigator.pointerEnabled })(),


  // Does the system support a mouse
  // This is required to identify touch devices that do not support
  // a mouse interface. This is used because mouse events are still fired
  // from mobile devices.
  //
  // This may need updated when Android desktops come out but hopefully
  // everyone will just adopt the pointer spec.
  //
  noMouse: (function () {
    var mobileRegex = /mobile|tablet|ip(ad|hone|od)|android|silk/i;
    return (
      ('ontouchstart' in window) &&
      !!navigator.userAgent.match(mobileRegex)
    );
  })()
}

// Get Event Types that are used to bind the different event concepts
// start, move, end, cancel. This method helps normalize event binding and
// prevent improper event listening, etc
//
Gala.getEventTypes = function () {
  var types;

  if (Gala.Pointers.ENV.pointer) {
    types = [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel'
    ];
  } else if (Gala.Pointers.ENV.msPointer) {
    types = [
      'MSPointerDown',
      'MSPointerMove',
      'MSPointerUp',
      'MSPointerCancel'
    ];
  } else if (Gala.Pointers.ENV.noMouse) {
    types = [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel'
    ];
  } else {
    types = [
      'touchstart mousedown',
      'touchmove mousemove',
      'touchend mouseup',
      'touchcancel'
    ];
  }

  return {
    start: types[0],
    move: types[1],
    end: types[2],
    cancel: types[3]
  };
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
      evt.type.match(/mouse|pointer/i) ? evt :
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
    API.event = evt;

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

Gala.throttle = function (func, wait) {
  var previous = 0;

  return function () {
    var now = new Date();
    var remaining = wait - (now - previous);
    if (remaining <= 0) {
      previous = now;
      func.apply(this, arguments);
    }
  }
}




// CONSTANTS
//
Gala.TAPPING_CLASS = 'tapping';
Gala.IE_REGISTRATIONS = {};
Gala.IE_INVOCATION_QUEUE = [];
Gala.CONTACT_CANCEL = "gala:contact:cancel";
Gala.TAP_MAX_CONTACT_DISTANCE = 10;
