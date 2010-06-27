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


// Borrowed from Prototype.
Monocle.Browser = {
  IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  Opera: navigator.userAgent.indexOf('Opera') > -1,
  WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  Gecko: navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1,
  MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
}


Monocle.Browser.Version = (function () {
  // TODO
})();


Monocle.Browser.touch = (typeof Touch == "object");

Monocle.Browser.addContactListeners =
  function (elem, startFn, moveFn, endFn, cancelFn) {
    var eL = elem.offsetLeft, eT = elem.offsetTop;
    var cursorInfo = function (evt, ci) {
      evt.monocleData = {
        elementX: ci.offsetX,
        elementY: ci.offsetY,
        pageX: ci.pageX,
        pageY: ci.pageY
      };
      return evt;
    }
    listeners = {}

    if (!Monocle.Browser.touch) {
      if (startFn) {
        listeners.mousedown = function (evt) {
          if (evt.button != 0) { return; }
          startFn(cursorInfo(evt, evt));
        }
        Monocle.addListener(elem, 'mousedown', listeners.mousedown);
      }
      if (moveFn) {
        listeners.mousemove = function (evt) {
          moveFn(cursorInfo(evt, evt));
        }
        Monocle.addListener(elem, 'mousemove', listeners.mousemove);
      }
      if (endFn) {
        listeners.mouseup = function (evt) {
          endFn(cursorInfo(evt, evt));
        }
        Monocle.addListener(elem, 'mouseup', listeners.mouseup);
      }
      if (cancelFn) {
        listeners.mouseout = function (evt) {
          // obj = evt.relatedTarget || e.fromElement;
          // while (obj && (obj = obj.parentNode)) {
          //   if (obj == p.divs.box) { return; }
          // }
          cancelFn(cursorInfo(evt, evt));
        }
        Monocle.addListener(elem, 'mouseout', listeners.mouseout);
      }
    } else {
      if (startFn) {
        listeners.touchstart = function (evt) {
          if (evt.touches.length > 1) { return; }
          startFn(cursorInfo(evt, evt.targetTouches[0]));
        }
        Monocle.addListener(elem, 'touchstart', listeners.touchstart);
      }
      if (moveFn) {
        listeners.touchmove = function (evt) {
          if (evt.touches.length > 1) { return; }
          //var e = elemDimensions();
          // var raw = {
          //   x: evt.targetTouches[0].pageX - e.l,
          //   y: evt.targetTouches[0].pageY - e.t
          // }
          // if (raw.x < 0 || raw.y < 0 || raw.x >= e.w || raw.y >= e.h) {
          //   if (endFn) {
          //     endFn(cursorInfo(evt, evt.targetTouches[0]));
          //   } else {
          //     moveFn(cursorInfo(evt, evt.targetTouches[0]));
          //   }
          // }
          moveFn(cursorInfo(evt, evt.targetTouches[0]));
        }
        Monocle.addListener(elem, 'touchmove', listeners.touchmove);
      }
      if (endFn) {
        listeners.touchend = function (evt) {
          endFn(cursorInfo(evt, evt.changedTouches[0]));
          evt.preventDefault();
        }
        Monocle.addListener(elem, 'touchend', listeners.touchend);
      }
      if (cancelFn) {
        listeners.touchcancel = function (evt) {
          cancelFn(cursorInfo(evt, evt.changedTouches[0]));
        }
        Monocle.addListener(elem, 'touchcancel', listeners.touchcancel);
      }
    }

    return listeners;
  }


Monocle.Browser.removeContactListeners = function (elem, listeners) {
  for (evtType in listeners) {
    Monocle.removeListener(elem, evtType, listeners[evtType]);
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


  // A namespace for browser-specific methods.
  Monocle.Compat = {}


  Monocle.Compat.enableTouchProxyOnFrame = function (frame) {
    if (frame.m.touchProxy) {
      return;
    }
    var fn = function (evt) { Monocle.Compat.touchProxyHandler(frame, evt); }
    var doc = frame.contentWindow.document;
    Monocle.addListener(doc, 'touchstart', fn);
    Monocle.addListener(doc, 'touchmove', fn);
    Monocle.addListener(doc, 'touchend', fn);
    Monocle.addListener(doc, 'touchcancel', fn);
    frame.m.touchProxy = true;
  }


  Monocle.Compat.touchProxyHandler = function (frame, evt) {
    var touch = evt.touches[0] || evt.changedTouches[0];
    var target = document.elementFromPoint(
      touch.screenX,
      touch.screenY
    );
    if (!target) {
      console.log('No target for ' + evt.type);
      return;
    }
    if (target == frame) {
      //console.log(evt.type + ' touch: target is component frame.');
      return;
    }
    // console.log(
    //   evt.type + ' touch: target is "' +
    //   target.tagName + "#" +  target.id + '"'
    // );

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

}

Monocle.pieceLoaded('compat');
