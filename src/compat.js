/* Standardized event registration - coheres the W3C and MS event models. */

Monocle.Events = {}


Monocle.Events.listen = function (elem, evtType, fn, useCapture) {
  if (elem.addEventListener) {
    return elem.addEventListener(evtType, fn, useCapture || false);
  } else if (elem.attachEvent) {
    return elem.attachEvent('on'+evtType, fn);
  }
}


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
    evt.monocleData = {
      elementX: ci.offsetX,
      elementY: ci.offsetY,
      pageX: ci.pageX,
      pageY: ci.pageY
    };
    return evt;
  }

  if (!Monocle.Browser.has.touch) {
    if (fns.start) {
      listeners.mousedown = function (evt) {
        if (evt.button != 0) { return; }
        fns.start(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mousedown', listeners.mousedown);
    }
    if (fns.move) {
      listeners.mousemove = function (evt) {
        fns.move(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mousemove', listeners.mousemove);
    }
    if (fns.end) {
      listeners.mouseup = function (evt) {
        fns.end(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mouseup', listeners.mouseup);
    }
    if (fns.cancel) {
      listeners.mouseout = function (evt) {
        obj = evt.relatedTarget || e.fromElement;
        while (obj && (obj = obj.parentNode)) {
          if (obj == elem) { return; }
        }
        fns.cancel(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mouseout', listeners.mouseout);
    }
  } else {
    if (fns.start) {
      listeners.touchstart = function (evt) {
        if (evt.touches.length > 1) { return; }
        fns.start(cursorInfo(evt, evt.targetTouches[0]));
      }
      Monocle.Events.listen(elem, 'touchstart', listeners.touchstart);
    }
    if (fns.move) {
      listeners.touchmove = function (evt) {
        if (evt.touches.length > 1) { return; }
        //var e = elemDimensions();
        // var raw = {
        //   x: evt.targetTouches[0].pageX - e.l,
        //   y: evt.targetTouches[0].pageY - e.t
        // }
        // if (raw.x < 0 || raw.y < 0 || raw.x >= e.w || raw.y >= e.h) {
        //   if (fns.end) {
        //     fns.end(cursorInfo(evt, evt.targetTouches[0]));
        //   } else {
        //     fns.move(cursorInfo(evt, evt.targetTouches[0]));
        //   }
        // }
        fns.move(cursorInfo(evt, evt.targetTouches[0]));
      }
      Monocle.Events.listen(elem, 'touchmove', listeners.touchmove);
    }
    if (fns.end) {
      listeners.touchend = function (evt) {
        fns.end(cursorInfo(evt, evt.changedTouches[0]));
        evt.preventDefault();
      }
      Monocle.Events.listen(elem, 'touchend', listeners.touchend);
    }
    if (fns.cancel) {
      listeners.touchcancel = function (evt) {
        fns.cancel(cursorInfo(evt, evt.changedTouches[0]));
      }
      Monocle.Events.listen(elem, 'touchcancel', listeners.touchcancel);
    }
  }

  return listeners;
}


Monocle.Events.deafenForContact = function (elem, listeners) {
  for (evtType in listeners) {
    Monocle.Events.deafen(elem, evtType, listeners[evtType]);
  }
}




//---------------------------------------------------------------------------


Monocle.Browser = {}


Monocle.Browser.is = {
  IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  Opera: navigator.userAgent.indexOf('Opera') > -1,
  WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  Gecko: navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1,
  MobileSafari: !!navigator.userAgent.match(/AppleWebKit.*Mobile/)
} // ... with thanks to PrototypeJS.


Monocle.Browser.has = {
  touch: (typeof Touch == "object"),
  columns: Monocle.Browser.is.WebKit || Monocle.Browser.is.Gecko,
  iframeTouchBug: Monocle.Browser.is.MobileSafari
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


  // A weak version of console.dir that works on iphones.
  window.console.compatDir = function (obj) {
    var stringify = function (o) {
      var parts = [];
      for (x in o) {
        // if (["object", "function"].indexOf(typeof(o[x]))) {
        //   parts.push("(" + x + " => " + stringify(o[x]) + ")");
        // } else {
          parts.push(x + ": " + o[x]);
        //}
      }
      return parts.join("; ");
    }

    window.console.log(stringify(obj));
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
    Monocle.Events.listen(doc, 'touchstart', fn);
    Monocle.Events.listen(doc, 'touchmove', fn);
    Monocle.Events.listen(doc, 'touchend', fn);
    Monocle.Events.listen(doc, 'touchcancel', fn);
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
