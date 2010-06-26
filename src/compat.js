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

Monocle.Browser.addContactListener = function (elem, evtType, fn) {
  var eL = elem.offsetLeft, eT = elem.offsetTop;
  var e = {
    l: elem.offsetLeft,
    t: elem.offsetTop,
    w: elem.offsetWidth,
    h: elem.offsetHeight
  }
  var cursorInfo = function (ci) {
    return {
      contactX: Math.min(e.w, Math.max(0, ci.pageX - e.l)),
      contactY: Math.min(e.h, Math.max(0, ci.pageY - e.t))
    };
  }

  if (!Monocle.Browser.touch) {
    switch (evtType) {
    case 'start':
      var f = function (evt) {
        if (evt.button != 0) { return; }
        elem.mouseDown = true;
        fn(cursorInfo(evt));
      }
      Monocle.addListener(elem, 'mousedown', f);
      return f;
    case 'move':
      var f = function (evt) {
        if (!elem.mouseDown) { return false; }
        fn(cursorInfo(evt));
      }
      Monocle.addListener(elem, 'mousemove', f);
      return f;
    case 'end':
      var f = function (evt) {
        if (!elem.mouseDown) { return false; }
        fn(cursorInfo(evt));
      }
      Monocle.addListener(elem, 'mouseup', f);
      return f;
    case 'cancel':
      var f = function (evt) {
        if (!elem.mouseDown) { return false; }
        obj = evt.relatedTarget || e.fromElement;
        while (obj && (obj = obj.parentNode)) {
          if (obj == p.divs.box) { return; }
        }
        fn(cursorInfo(evt));
      }
      Monocle.addListener(elem, 'mouseout', f);
      return f;
    }
  } else {
    switch(evtType) {
    case 'start':
      var f = function (evt) {
        if (evt.touches.length > 1) { return; }
        fn(cursorInfo(evt.targetTouches[0]));
      }
      Monocle.addListener(elem, 'touchstart', f);
      return f;
    case 'move':
      var f = function (evt) {
        if (evt.touches.length > 1) { return; }
        var raw = {
          x: evt.targetTouches[0].pageX - e.l,
          y: evt.targetTouches[0].pageY - e.t
        }
        if (raw.x < 0 || raw.y < 0 || raw.x >= e.w || raw.y >= e.h) {
          fn(evt, 'end'); // FIXME: how to invoke end evt?
        } else {
          fn(cursorInfo(evt.targetTouches[0]));
        }
      }
      Monocle.addListener(elem, 'touchmove', f);
      return f;
    case 'end':
      var f = function (evt) {
        fn(cursorInfo(evt.changedTouches[0]));
        evt.preventDefault();
      }
      Monocle.addListener(elem, 'touchend', f);
      return f;
    case 'cancel':
      var f = function (evt) {
        fn(cursorInfo(evt.changedTouches[0]));
      }
      Monocle.addListener(elem, 'touchcancel', f);
      return f;
    }
  }
}


Monocle.Browser.removeContactListener = function (elem, evtType, fn) {
  var evtTypes = {};
  if (!Monocle.Browser.touch) {
    evtTypes.start = 'mousedown';
    evtTypes.move = 'mousemove';
    evtTypes.end = 'mouseup';
    evtTypes.cancel = 'mouseout';
  } else {
    evtTypes.start = 'touchstart';
    evtTypes.move = 'touchmove';
    evtTypes.end = 'touchend';
    evtTypes.cancel = 'touchcancel';
  }
  Monocle.removeListener(elem, evtTypes[evtType], fn);
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
