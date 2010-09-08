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

var touching = null; // element currently being touched.
var edataPrev = null;

function init() {
  var iframes = document.getElementsByTagName('iframe');
  for (var i = 0; i < iframes.length; ++i) {
    enableTouchProxy(iframes[i].contentDocument.body);
    iframes[i].contentDocument.body.isTouchFrame = true;
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
  element.listeners = listeners;
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


function touchProxyHandler(target, evt) {
  var touch = evt.touches[0] || evt.changedTouches[0];

  edata = {
    start: evt.type == "touchstart",
    move: evt.type == "touchmove",
    end: evt.type == "touchend" || evt.type == "touchcancel",
    time: new Date().getTime(),
    frame: target.isTouchFrame
  }

  if (edata.frame) {
    target = document.elementFromPoint(touch.screenX, touch.screenY);
  }

  // FIXME! How to allow selections?
  evt.preventDefault();

  if (!target) {
    return;
  }

  if (!touching && typeof target.listeners == "undefined") {
    console.log(evt.type+' touch: target is not being listened to.');
    return;
  }

  var fireStart = function () {
    window.touching = target;
    window.edataPrev = edata;
    return fireTouchEvent(touching, 'start', evt);
  }

  var fireMove = function () {
    window.edataPrev = edata;
    return fireTouchEvent(touching, 'move', evt);
  }

  var fireEnd = function () {
    var result = fireTouchEvent(touching, 'end', evt);
    window.edataPrev = edata;
    window.touching = null;
    return result;
  }


  // If we have a touch start on the layer, and it's been almost no time since
  // we had a touch end on the layer, discard the start. (This is the most
  // broken thing about 4.1.)
  if (
    !edata.frame &&
    !touching &&
    edata.start &&
    window.edataPrev &&
    window.edataPrev.end &&
    (edata.time - window.edataPrev.time) < 50
  ) {
    console.log("discarded: " + (edata.time - window.edataPrev.time));
    return;
  }

  // If we don't have a touch and we see a start or a move on anything, start
  // a touch.
  if (!touching && !edata.end) {
    return fireStart();
  }

  // If this is a move event and we already have a touch, continue the move.
  if (edata.move && touching) {
    return fireMove();
  }

  // If we have a touch (and the event must be a start or end due to
  // previous rule), and the event is not on the iframe, fire end of touch.
  if (touching && !edata.frame) {
    return fireEnd();
  }

  // If we see a touch end on the frame, and the touch is not over the original
  // layer, then fire a touch end on the original layer.
  if (edata.frame && edata.end && touching && touching != target) {
    return fireEnd();
  }
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
    "touch"+newtype,
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

  mimicEvt.target = target;
  mimicEvt.currTarget = target;
  target.listeners[newtype](mimicEvt);
  if (mimicEvt.cancelled) {
    evt.preventDefault();
  }
}


window.addEventListener('load', init, false);
