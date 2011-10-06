Monocle.Events = {}


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
  if (elem.removeEventListener) {
    return elem.removeEventListener(evtType, fn, useCapture || false);
  } else if (elem.detachEvent) {
    try {
      return elem.detachEvent('on'+evtType, fn);
    } catch(e) {}
  }
}


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
      pageY: ci.pageY
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
    // on which the event is registered.
    if (evt.currentTarget) {
      offset = offsetFor(evt, evt.currentTarget);
      evt.m.registrantX = offset[0];
      evt.m.registrantY = offset[1];
    }

    return evt;
  }


  var offsetFor = function (evt, elem) {
    var r;
    if (elem.getBoundingClientRect) {
      var er = elem.getBoundingClientRect();
      var dr = document.body.getBoundingClientRect();
      r = { left: er.left - dr.left, top: er.top - dr.top };
    } else {
      r = { left: elem.offsetLeft, top: elem.offsetTop }
      while (elem = elem.parentNode) {
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
      listeners.start = function (evt) {
        if (evt.touches.length > 1) { return; }
        fns.start(cursorInfo(evt, evt.targetTouches[0]));
      }
    }
    if (fns.move) {
      listeners.move = function (evt) {
        if (evt.touches.length > 1) { return; }
        fns.move(cursorInfo(evt, evt.targetTouches[0]));
      }
    }
    if (fns.end) {
      listeners.end = function (evt) {
        fns.end(cursorInfo(evt, evt.changedTouches[0]));
        // BROWSERHACK:
        // If there is something listening for contact end events, we always
        // prevent the default, because TouchMonitor can't do it (since it
        // fires it on a delay: ugh). Would be nice to remove this line and
        // standardise things.
        evt.preventDefault();
      }
    }
    if (fns.cancel) {
      listeners.cancel = function (evt) {
        fns.cancel(cursorInfo(evt, evt.changedTouches[0]));
      }
    }

    if (Monocle.Browser.env.brokenIframeTouchModel) {
      Monocle.Events.tMonitor = Monocle.Events.tMonitor ||
        new Monocle.Events.TouchMonitor();
      Monocle.Events.tMonitor.listen(elem, listeners, options);
    } else {
      for (etype in listeners) {
        Monocle.Events.listen(elem, 'touch'+etype, listeners[etype], capture);
      }
    }
  }

  return listeners;
}


// The 'listeners' argument is a hash of event names and the functions that
// are registered to them -- de-registers the functions from the events.
//
Monocle.Events.deafenForContact = function (elem, listeners) {
  var prefix = "";
  if (Monocle.Browser.env.touch) {
    prefix = Monocle.Browser.env.brokenIframeTouchModel ? "contact" : "touch";
  }

  for (evtType in listeners) {
    Monocle.Events.deafen(elem, prefix + evtType, listeners[evtType]);
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



// BROWSERHACK: iOS touch events on iframes are busted. The TouchMonitor,
// transposes touch events on underlying iframes onto the elements that
// sit above them. It's a massive hack.
Monocle.Events.TouchMonitor = function () {
  if (Monocle.Events == this) {
    return new Monocle.Events.TouchMonitor();
  }

  var API = { constructor: Monocle.Events.TouchMonitor }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    touching: null,
    edataPrev: null,
    originator: null,
    brokenModel_4_1: navigator.userAgent.match(/ OS 4_1/)
  }


  function listenOnIframe(iframe) {
    if (iframe.contentDocument) {
      enableTouchProxy(iframe.contentDocument);
      iframe.contentDocument.isTouchFrame = true;
    }

    // IN 4.1 ONLY, a touchstart/end/both fires on the *frame* itself when a
    // touch completes on a part of the iframe that is not overlapped by
    // anything. This should be translated to a touchend on the touching
    // object.
    if (p.brokenModel_4_1) {
      enableTouchProxy(iframe);
    }
  }


  function listen(element, fns, useCapture) {
    for (etype in fns) {
      Monocle.Events.listen(element, 'contact'+etype, fns[etype], useCapture);
    }
    enableTouchProxy(element, useCapture);
  }


  function enableTouchProxy(element, useCapture) {
    if (element.monocleTouchProxy) {
      return;
    }
    element.monocleTouchProxy = true;

    var fn = function (evt) { touchProxyHandler(element, evt) }
    Monocle.Events.listen(element, "touchstart", fn, useCapture);
    Monocle.Events.listen(element, "touchmove", fn, useCapture);
    Monocle.Events.listen(element, "touchend", fn, useCapture);
    Monocle.Events.listen(element, "touchcancel", fn, useCapture);
  }


  function touchProxyHandler(element, evt) {
    var edata = {
      start: evt.type == "touchstart",
      move: evt.type == "touchmove",
      end: evt.type == "touchend" || evt.type == "touchcancel",
      time: new Date().getTime(),
      frame: element.isTouchFrame
    }

    if (!p.touching) {
      p.originator = element;
    }

    var target = element;
    var touch = evt.touches[0] || evt.changedTouches[0];
    target = document.elementFromPoint(touch.screenX, touch.screenY);

    if (target) {
      translateTouchEvent(element, target, evt, edata);
    }
  }


  function translateTouchEvent(element, target, evt, edata) {
    // IN 4.1 ONLY, if we have a touch start on the layer, and it's been
    // almost no time since we had a touch end on the layer, discard the start.
    // (This is the most broken thing about 4.1.)
    // FIXME: this seems to discard all "taps" on a naked iframe.
    if (
      p.brokenModel_4_1 &&
      !edata.frame &&
      !p.touching &&
      edata.start &&
      p.edataPrev &&
      p.edataPrev.end &&
      (edata.time - p.edataPrev.time) < 30
    ) {
      evt.preventDefault();
      return;
    }

    // If we don't have a touch and we see a start or a move on anything, start
    // a touch.
    if (!p.touching && !edata.end) {
      return fireStart(evt, target, edata);
    }

    // If this is a move event and we already have a touch, continue the move.
    if (edata.move && p.touching) {
      return fireMove(evt, edata);
    }

    if (p.brokenModel_4_1) {
      // IN 4.1 ONLY, if we have a touch in progress, and we see a start, end
      // or cancel event (moves are covered in previous rule), and the event
      // is not on the iframe, end the touch.
      // (This is because 4.1 bizarrely sends a random event to the layer
      // above the iframe, rather than an end event to the iframe itself.)
      if (p.touching && !edata.frame) {
        // However, a touch start will fire on the layer when moving out of
        // the overlap with the frame. This would trigger the end of the touch.
        // And the immediately subsequent move starts a new touch.
        //
        // To get around this, we only provisionally end the touch - if we get
        // a touchmove momentarily, we'll cancel this touchend.
        return fireProvisionalEnd(evt, edata);
      }
    } else {
      // In older versions of MobileSafari, if the touch ends when we're
      // touching something, just fire it.
      if (edata.end && p.touching) {
        return fireProvisionalEnd(evt, edata);
      }
    }

    // IN 4.1 ONLY, a touch that has started outside an iframe should not be
    // endable by the iframe.
    if (
      p.brokenModel_4_1 &&
      p.originator != element &&
      edata.frame &&
      edata.end
    ) {
      evt.preventDefault();
      return;
    }

    // If we see a touch end on the frame, end the touch.
    if (edata.frame && edata.end && p.touching) {
      return fireProvisionalEnd(evt, edata);
    }
  }


  function fireStart(evt, target, edata) {
    p.touching = target;
    p.edataPrev = edata;
    return fireTouchEvent(p.touching, 'start', evt);
  }


  function fireMove(evt, edata) {
    clearProvisionalEnd();
    p.edataPrev = edata;
    return fireTouchEvent(p.touching, 'move', evt);
  }


  function fireEnd(evt, edata) {
    var result = fireTouchEvent(p.touching, 'end', evt);
    p.edataPrev = edata;
    p.touching = null;
    return result;
  }


  function fireProvisionalEnd(evt, edata) {
    clearProvisionalEnd();
    var mimicEvt = mimicTouchEvent(p.touching, 'end', evt);
    p.edataPrev = edata;

    p.provisionalEnd = setTimeout(
      function() {
        if (p.touching) {
          p.touching.dispatchEvent(mimicEvt);
          p.touching = null;
        }
      },
      30
    );
  }


  function clearProvisionalEnd() {
    if (p.provisionalEnd) {
      clearTimeout(p.provisionalEnd);
      p.provisionalEnd = null;
    }
  }


  function mimicTouchEvent(target, newtype, evt) {
    var cloneTouch = function (t) {
      return document.createTouch(
        document.defaultView,
        target,
        t.identifier,
        t.screenX,
        t.screenY,
        t.screenX,
        t.screenY
      );
    }

    var findTouch = function (id) {
      for (var i = 0; i < touches.all.length; ++i) {
        if (touches.all[i].identifier == id) {
          return touches.all[i];
        }
      }
    }

    // Mimic the event data, dispatching it on the new target.
    var touches = { all: [], target: [], changed: [] };
    for (var i = 0; i < evt.touches.length; ++i) {
      touches.all.push(cloneTouch(evt.touches[i]));
    }
    for (var i = 0; i < evt.targetTouches.length; ++i) {
      touches.target.push(
        findTouch(evt.targetTouches[i].identifier) ||
        cloneTouch(evt.targetTouches[i])
      );
    }
    for (var i = 0; i < evt.changedTouches.length; ++i) {
      touches.changed.push(
        findTouch(evt.changedTouches[i].identifier) ||
        cloneTouch(evt.changedTouches[i])
      );
    }

    var mimicEvt = document.createEvent('TouchEvent');
    mimicEvt.initTouchEvent(
      "contact"+newtype,
      true,
      true,
      document.defaultView,
      evt.detail,
      evt.screenX,
      evt.screenY,
      evt.screenX,
      evt.screenY,
      evt.ctrlKey,
      evt.altKey,
      evt.shiftKey,
      evt.metaKey,
      document.createTouchList.apply(document, touches.all),
      document.createTouchList.apply(document, touches.target),
      document.createTouchList.apply(document, touches.changed),
      evt.scale,
      evt.rotation
    );

    return mimicEvt;
  }


  function fireTouchEvent(target, newtype, evt) {
    var mimicEvt = mimicTouchEvent(target, newtype, evt);
    var result = target.dispatchEvent(mimicEvt);
    if (!result) {
      evt.preventDefault();
    }
    return result;
  }


  API.listen = listen;
  API.listenOnIframe = listenOnIframe;

  return API;
}


Monocle.Events.listenOnIframe = function (frame) {
  if (!Monocle.Browser.env.brokenIframeTouchModel) {
    return;
  }
  Monocle.Events.tMonitor = Monocle.Events.tMonitor ||
    new Monocle.Events.TouchMonitor();
  Monocle.Events.tMonitor.listenOnIframe(frame);
}

Monocle.pieceLoaded('core/events');
