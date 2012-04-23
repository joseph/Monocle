Monocle.Events = {};


// Fire a custom event on a given target element. The attached data object will
// be available to all listeners at evt.m.
//
// Internet Explorer does not permit custom events; we'll wait for a
// version of IE that supports the W3C model.
//
Monocle.Events.dispatch = function (elem, evtType, data, cancelable) {
  if (!document.createEvent) {
    return true;
  }
  var evt = document.createEvent("Events");
  evt.initEvent(evtType, false, cancelable || false);
  evt.m = data;
  try {
    return elem.dispatchEvent(evt);
  } catch(e) {
    console.warn("Failed to dispatch event: "+evtType);
    return false;
  }
}


// Register a function to be invoked when an event fires.
//
Monocle.Events.listen = function (elem, evtType, fn, useCapture) {
  if (typeof elem == "string") { elem = document.getElementById(elem); }
  return elem.addEventListener(evtType, fn, useCapture || false);
}


// De-register a function from an event.
//
Monocle.Events.deafen = function (elem, evtType, fn, useCapture) {
  if (typeof elem == "string") { elem = document.getElementById(elem); }
  return elem.removeEventListener(evtType, fn, useCapture || false);
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
// Each function is passed the event, with additional generic info about the
// cursor/touch position:
//
//    event.m.offsetX (& offsetY) -- relative to top-left of the element
//                                   on which the event fired
//    event.m.registrantX (& registrantY) -- relative to top-left of element
//                                           on which the event is listening
//
// 'options' argument:
//
//   {
//     'useCapture': true/false
//   }
//
// Returns an object that can later be passed to Monocle.Events.deafenForContact
//
Monocle.Events.listenForContact = function (elem, fns, options) {
  var listeners = {};

  var cursorInfo = function (evt, ci) {
    evt.m = {
      pageX: ci.pageX,
      pageY: ci.pageY,
      clientX: ci.clientX,
      clientY: ci.clientY,
      screenX: ci.screenX,
      screenY: ci.screenY
    };

    var target = evt.target || evt.srcElement;
    while (target.nodeType != 1 && target.parentNode) {
      target = target.parentNode;
    }

    // The position of contact from the top left of the element
    // on which the event fired.
    var offset = offsetFor(evt, target);
    evt.m.offsetX = offset[0];
    evt.m.offsetY = offset[1];

    // The position of contact from the top left of the element
    // on which the event is listening.
    if (
      evt.currentTarget &&
      typeof evt.currentTarget.offsetLeft != 'undefined'
    ) {
      offset = offsetFor(evt, evt.currentTarget);
      evt.m.registrantX = offset[0];
      evt.m.registrantY = offset[1];
    }

    return evt;
  }


  var offsetFor = function (evt, elem) {
    var r;
    if (elem.getBoundingClientRect) {
      // Why subtract documentElement position? It's always zero, right?
      // Nope, not on Android when zoomed in.
      var dr = document.documentElement.getBoundingClientRect();
      var er = elem.getBoundingClientRect();
      r = { left: er.left - dr.left, top: er.top - dr.top };
    } else {
      r = { left: elem.offsetLeft, top: elem.offsetTop }
      while (elem = elem.offsetParent) {
        if (elem.offsetLeft || elem.offsetTop) {
          r.left += elem.offsetLeft;
          r.top += elem.offsetTop;
        }
      }
    }
    return [evt.m.pageX - r.left, evt.m.pageY - r.top];
  }


  var capture = (options && options.useCapture) || false;

  if (!Monocle.Browser.env.touch) {
    if (fns.start) {
      listeners.mousedown = function (evt) {
        if (evt.button != 0) { return; }
        fns.start(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mousedown', listeners.mousedown, capture);
    }
    if (fns.move) {
      listeners.mousemove = function (evt) {
        fns.move(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mousemove', listeners.mousemove, capture);
    }
    if (fns.end) {
      listeners.mouseup = function (evt) {
        fns.end(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mouseup', listeners.mouseup, capture);
    }
    if (fns.cancel) {
      listeners.mouseout = function (evt) {
        obj = evt.relatedTarget || evt.fromElement;
        while (obj && (obj = obj.parentNode)) {
          if (obj == elem) { return; }
        }
        fns.cancel(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mouseout', listeners.mouseout, capture);
    }
  } else {
    if (fns.start) {
      listeners.touchstart = function (evt) {
        if (evt.touches.length > 1) { return; }
        fns.start(cursorInfo(evt, evt.targetTouches[0]));
      }
    }
    if (fns.move) {
      listeners.touchmove = function (evt) {
        if (evt.touches.length > 1) { return; }
        fns.move(cursorInfo(evt, evt.targetTouches[0]));
      }
    }
    if (fns.end) {
      listeners.touchend = function (evt) {
        fns.end(cursorInfo(evt, evt.changedTouches[0]));
      }
    }
    if (fns.cancel) {
      listeners.touchcancel = function (evt) {
        fns.cancel(cursorInfo(evt, evt.changedTouches[0]));
      }
    }

    for (etype in listeners) {
      Monocle.Events.listen(elem, etype, listeners[etype], capture);
    }
  }

  return listeners;
}


// The 'listeners' argument is a hash of event names and the functions that
// are registered to them -- de-registers the functions from the events.
//
Monocle.Events.deafenForContact = function (elem, listeners) {
  for (evtType in listeners) {
    Monocle.Events.deafen(elem, evtType, listeners[evtType]);
  }
}


// Looks for start/end events on an element without significant move events in
// between. Fires on the end event.
//
// Also sets up a dummy click event on Kindle3, so that the elem becomes a
// cursor target.
//
// If the optional activeClass string is provided, and if the element was
// created by a Monocle.Factory, then the activeClass will be applied to the
// element while it is being tapped.
//
// Returns a listeners object that you should pass to deafenForTap if you
// need to.
Monocle.Events.listenForTap = function (elem, fn, activeClass) {
  var startPos;

  // On Kindle, register a noop function with click to make the elem a
  // cursor target.
  if (Monocle.Browser.on.Kindle3) {
    Monocle.Events.listen(elem, 'click', function () {});
  }

  var annul = function () {
    startPos = null;
    if (activeClass && elem.dom) { elem.dom.removeClass(activeClass); }
  }

  var annulIfOutOfBounds = function (evt) {
    // We don't have to track this nonsense for mouse events.
    if (evt.type.match(/^mouse/)) {
      return;
    }
    // Doesn't work on iOS 3.1 for some reason, so ignore for that version.
    if (Monocle.Browser.is.MobileSafari && Monocle.Browser.iOSVersion < "3.2") {
      return;
    }
    if (
      evt.m.registrantX < 0 || evt.m.registrantX > elem.offsetWidth ||
      evt.m.registrantY < 0 || evt.m.registrantY > elem.offsetHeight
    ) {
      annul();
    }
  }

  return Monocle.Events.listenForContact(
    elem,
    {
      start: function (evt) {
        startPos = [evt.m.pageX, evt.m.pageY];
        if (activeClass && elem.dom) { elem.dom.addClass(activeClass); }
      },
      move: annulIfOutOfBounds,
      end: function (evt) {
        annulIfOutOfBounds(evt);
        if (startPos) {
          evt.m.startOffset = startPos;
          fn(evt);
        }
        annul();
      },
      cancel: annul
    },
    {
      useCapture: false
    }
  );
}


Monocle.Events.deafenForTap = Monocle.Events.deafenForContact;

// Listen for the next transition-end event on the given element, call
// the function, then deafen.
//
// Returns a function that can be used to cancel the listen early.
//
Monocle.Events.afterTransition = function (elem, fn) {
  var evtName = "transitionend";
  if (Monocle.Browser.is.WebKit) {
    evtName = 'webkitTransitionEnd';
  } else if (Monocle.Browser.is.Opera) {
    evtName =  'oTransitionEnd';
  }
  var l = null, cancel = null;
  l = function () { fn(); cancel(); }
  cancel = function () { Monocle.Events.deafen(elem, evtName, l); }
  Monocle.Events.listen(elem, evtName, l);
  return cancel;
}
