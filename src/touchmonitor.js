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


  function initialize() {
    findIframes();
    Monocle.Events.listen(
      document,
      'DOMNodeInsertedIntoDocument',
      function (evt) {
        if (evt.target.tagName != 'iframe') { return; }
        listenOnIframe(evt.target);
      }
    );
  }


  function findIframes() {
    var iframes = document.getElementsByTagName('iframe');
    for (var i = 0; i < iframes.length; ++i) {
      listenOnIframe(iframes[i]);
    }
  }


  function listenOnIframe(iframe) {
    enableTouchProxy(iframe.contentDocument.body);
    iframe.contentDocument.body.isTouchFrame = true;

    // IN 4.1 ONLY, a touchstart/end/both fires on the *frame* itself when a
    // touch completes on a part of the iframe body that is not overlapped
    // by anything. This should be translated to a touchend on the touching
    // object.
    if (p.brokenModel_4_1) {
      enableTouchProxy(iframe);
    }

    Monocle.Events.listen(
      iframe,
      'load',
      function () { listenOnIframe(iframe) }
    );
  }


  function monitor(element, fns, listenOptions) {
    if (fns.start) {
      element.addEventListener('contactstart', fns.start, false);
    }
    if (fns.move) {
      element.addEventListener('contactmove', fns.move, false);
    }
    if (fns.end) {
      element.addEventListener('contactend', fns.end, false);
    }
    if (fns.cancel) {
      element.addEventListener('contactcancel', fns.cancel, false);
    }
    enableTouchProxy(element, listenOptions);
  }


  function enableTouchProxy(element, listenOptions) {
    if (element.monocleTouchProxy) {
      return;
    }
    element.monocleTouchProxy = true;

    var fn = function (evt) { touchProxyHandler(element, evt) }
    Monocle.Events.listenForContact(
      element,
      { start: fn, move: fn, end: fn, cancel: fn },
      listenOptions
    );
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
    if (edata.frame) {
      target = document.elementFromPoint(touch.screenX, touch.screenY);
    }

    // FIXME! How to allow selections?
    // Only preventDefault if there is a touching object at the end of this
    // action?
    evt.preventDefault();

    if (!target) {
      return;
    }

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
      console.log("discarded: " + (edata.time - p.edataPrev.time));
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

    // If we have a touch (and the event must be a start or end due to our
    // previous rule), and the event is not on the iframe, end the touch.
    if (p.touching && !edata.frame) {
      return fireEnd(evt, edata);
    }

    // IN 4.1 ONLY, a touch that has started outside an iframe should not be
    // endable by the iframe.
    if (
      p.brokenModel_4_1 &&
      p.originator != element &&
      edata.frame &&
      edata.end
    ) {
      return;
    }

    // If we see a touch end on the frame, end the touch.
    if (edata.frame && edata.end && p.touching) {
      return fireEnd(evt, edata);
    }

    // Unsolved:
    // A touch start fires on the layer when moving out of the overlap
    // with the frame. This triggers end of touch. The next move starts a new
    // touch.
  }


  function fireStart(evt, target, edata) {
    p.touching = target;
    p.edataPrev = edata;
    return fireTouchEvent(p.touching, 'start', evt);
  }


  function fireMove(evt, edata) {
    p.edataPrev = edata;
    return fireTouchEvent(p.touching, 'move', evt);
  }


  function fireEnd(evt, edata) {
    var result = fireTouchEvent(p.touching, 'end', evt);
    p.edataPrev = edata;
    p.touching = null;
    return result;
  }


  function fireTouchEvent(target, newtype, evt) {
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
    mimicEvt.proxied = true;

    if (!target.dispatchEvent(mimicEvt)) {
      evt.preventDefault();
    }
  }


  initialize();

  API.monitor = monitor;

  return API;
}
