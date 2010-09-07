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
  var frameTouch = target.isTouchFrame;
  if (frameTouch) {
    target = document.elementFromPoint(touch.screenX, touch.screenY);
    // if (!target) {
    //   console.warn('No target for ' + evt.type);
    //   return;
    // }
  }

  if (!touching && typeof target.listeners == "undefined") {
    console.log(evt.type+' touch: target is not being listened to.');
    return;
  }

  // console.log(
  //   evt.type + ' touch: target is "' +
  //   target.tagName + "#" +  target.id + '"'
  // );

  evt.preventDefault();

  if (!touching) {
    if (!frameTouch) {
      return;
    }
    touching = target;
    return fireTouchEvent(target, 'start', evt);
  } else {
    if (!frameTouch || target != touching || evt.type == "touchend") {
      fireTouchEvent(touching, 'end', evt);
      window.touching = null;
      return;
    }

    if (evt.type == "touchstart" && frameTouch) {
      return;
    }
    if (evt.type == "touchmove") {
      return fireTouchEvent(touching, 'move', evt);
    }
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
