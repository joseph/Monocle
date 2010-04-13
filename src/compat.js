/* Standardized event registration - coheres the W3C and MS event models. */

Monocle.addListener = function (elem, evtType, fn, useCapture) {
  if (elem.addEventListener) {
    return elem.addEventListener(evtType, fn, useCapture || false);
  } else if (elem.attachEvent) {
    return elem.attachEvent('on'+evtType, fn);
  }
}


Monocle.removeListener = function (elem, evtType, fn, useCapture) {
  if (elem.removeEventListener) {
    return elem.removeEventListener(evtType, fn, useCapture || false);
  } else if (elem.detachEvent) {
    try {
      return elem.detachEvent('on'+evtType, fn);
    } catch(e) {}
  }
}


if (typeof(MONOCLE_NO_COMPAT) == 'undefined') {

  // A little console stub if not initialized in a console-equipped browser.
  if (typeof window.console == "undefined") {
    window.console = {
      messages: [],
      log: function (msg) {
        this.messages.push(msg);
      }
    }
  }


  // indexOf code for IE - ripped from the Mozilla docs.
  //
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(elt /*, from*/) {
      var len = this.length >>> 0;

      var from = Number(arguments[1]) || 0;
      from = (from < 0)
        ? Math.ceil(from)
        : Math.floor(from);
      if (from < 0) {
        from += len;
      }

      for (; from < len; from++) {
        if (from in this && this[from] === elt) {
          return from;
        }
      }
      return -1;
    };
  }

}


Monocle.enableTouchProxyOnFrame = function (frame) {
  var fn = function (evt) { Monocle.touchProxyFn(frame, evt); }
  var doc = frame.contentWindow.document;
  Monocle.addListener(doc, 'touchstart', fn);
  Monocle.addListener(doc, 'touchmove', fn);
  Monocle.addListener(doc, 'touchend', fn);
  Monocle.addListener(doc, 'touchcancel', fn);
}


Monocle.touchProxyFn = function (frame, evt) {
  // var offsets = { x: 0, y: 0 }
  // var node = frame;
  // while (node && node.nodeType == 1) {
  //   offsets.x += node.offsetLeft;
  //   offsets.y += node.offsetTop;
  //   node = node.parentNode;
  // }
  var touch = evt.touches[0] || evt.changedTouches[0];
  // console.log("Screen: " + touch.screenX + ", " + touch.screenY);
  // console.log("Page: " + touch.pageX + ", " + touch.pageY);
  // var div = frame.parentNode;
  // console.log(
  //   "Client?: " + (touch.pageX - div.scrollLeft) + ", " +
  //   (touch.pageY - div.scrollTop)
  // );
  var target = document.elementFromPoint(
    touch.screenX,
    touch.screenY
  );
  if (!target) {
    console.log('No target for ' + evt.type);
    return;
  }
  if (target == frame) {
    return;
  }

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
    evt.type,
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

  if (!target.dispatchEvent(mimicEvt)) {
    evt.preventDefault();
  }
}


Monocle.pieceLoaded('compat');
