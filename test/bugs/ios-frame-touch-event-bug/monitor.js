// The job of the monitor is to know which events to fire and which to discard.
//
// Because it can't stop errant touches firing on the actual target,
// the monitor should take:
//  - the element
//  - the callbacks for each event type
//
// It's the monitor that should actually invoke the callbacks -- they're not
// registered against the events themselves.
//
// So: monitor registers on the body and on each iframe. It takes a touch,
// looks for the elementFromPoint, decides whether the event is a continuation
// of an existing touch or a new touch or something to discard entirely,
// then checks whether there is an equivalent callback for the given element.
// If so, calls it.
//
// Only needs to do elementFromPoint if iframe is the currentTarget.

var p = {
  touching: null,
  edataPrev: null,
  originator: null,
  brokenModel_4_1: navigator.userAgent.match(/ OS 4_1/)
}

function init() {
  var iframes = document.getElementsByTagName('iframe');
  for (var i = 0; i < iframes.length; ++i) {
    enableTouchProxy(iframes[i].contentDocument.body);
    iframes[i].contentDocument.body.isTouchFrame = true;

    // IN 4.1 ONLY, a touchstart/end/both fires on the *frame* itself when a
    // touch completes on a part of the iframe body that is not overlapped
    // by anything. This should be translated to a touchend on the touching
    // object.
    if (p.brokenModel_4_1) {
      enableTouchProxy(iframes[i]);
    }
  }
  monitor(
    document.getElementById('layer'),
    {
      start: touchEvt,
      move: touchEvt,
      end: touchEvt,
      cancel: touchEvt
    }
  );
  document.getElementById('layer').evtClass = 'layer';
}


function monitor(element, listeners) {
  element.addEventListener('contactstart', listeners.start, false);
  element.addEventListener('contactmove', listeners.move, false);
  element.addEventListener('contactend', listeners.end, false);
  element.addEventListener('contactcancel', listeners.cancel, false);
  enableTouchProxy(element);
}


function enableTouchProxy(tgt) {
  var fn = function (evt) { touchProxyHandler(tgt, evt); }
  tgt.addEventListener('touchstart', fn, false);
  tgt.addEventListener('touchmove', fn, false);
  tgt.addEventListener('touchend', fn, false);
  tgt.addEventListener('touchcancel', fn, false);
  tgt.touchProxy = true;
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

  // if (!touching && typeof target.listeners == "undefined") {
  //   console.log(evt.type+' touch: target is not being listened to.');
  //   return;
  // }

  var fireStart = function () {
    p.touching = target;
    p.edataPrev = edata;
    return fireTouchEvent(p.touching, 'start', evt);
  }

  var fireMove = function () {
    p.edataPrev = edata;
    return fireTouchEvent(p.touching, 'move', evt);
  }

  var fireEnd = function () {
    var result = fireTouchEvent(p.touching, 'end', evt);
    p.edataPrev = edata;
    p.touching = null;
    return result;
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
    return fireStart();
  }

  // If this is a move event and we already have a touch, continue the move.
  if (edata.move && p.touching) {
    return fireMove();
  }

  // If we have a touch (and the event must be a start or end due to our
  // previous rule), and the event is not on the iframe, end the touch.
  if (p.touching && !edata.frame) {
    return fireEnd();
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
    return fireEnd();
  }

  // Unsolved:
  // A touch start fires on the layer when moving out of the overlap
  // with the frame. This triggers end of touch. The next move starts a new
  // touch.
  //
  //
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


window.addEventListener('load', init, false);
