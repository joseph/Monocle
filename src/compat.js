Monocle.Browser = {}


Monocle.Browser.is = {
  IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  Opera: navigator.userAgent.indexOf('Opera') > -1,
  WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  Gecko: navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1,
  MobileSafari: !!navigator.userAgent.match(/AppleWebKit.*Mobile/)
} // ... with thanks to PrototypeJS.


if (Monocle.Browser.is.MobileSafari) {
  (function () {
    var ver = navigator.userAgent.match(/ OS ([\d_]+)/);
    if (ver) {
      Monocle.Browser.iOSVersion = ver[1].replace(/_/g, '.');
    } else {
      console.warn("Unknown MobileSafari user agent: "+navigator.userAgent);
    }
  })();
}


Monocle.Browser.on = {
  iPhone: navigator.userAgent.indexOf("iPhone") != -1,
  iPad: navigator.userAgent.indexOf("iPad") != -1
  // TODO: Mac, Windows, etc
}


Monocle.Browser.has = {
  touch: (typeof Touch == "object"),
  columns: Monocle.Browser.is.WebKit || Monocle.Browser.is.Gecko,
  iframeTouchBug: Monocle.Browser.is.MobileSafari &&
    Monocle.Browser.iOSVersion < "4.1",
  floatColumnBug: Monocle.Browser.is.MobileSafari &&
    Monocle.Browser.iOSVersion >= "4.0",
  selectThruBug: Monocle.Browser.is.MobileSafari
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
        parts.push(x + ": " + o[x]);
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
    var doc = frame.contentWindow.document;
    if (doc.touchProxy) {
      return;
    }
    var fn = function (evt) { Monocle.Compat.touchProxyHandler(frame, evt); }
    Monocle.Events.listen(doc, 'touchstart', fn);
    Monocle.Events.listen(doc, 'touchmove', fn);
    Monocle.Events.listen(doc, 'touchend', fn);
    Monocle.Events.listen(doc, 'touchcancel', fn);
    doc.touchProxy = true;
  }


  Monocle.Compat.touchProxyHandler = function (frame, evt) {
    var touch = evt.touches[0] || evt.changedTouches[0];
    var target = document.elementFromPoint(
      touch.screenX,
      touch.screenY
    );
    if (!target) {
      console.warn('No target for ' + evt.type);
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
    mimicEvt.proxied = true;

    if (!target.dispatchEvent(mimicEvt)) {
      evt.preventDefault();
    }
  }

}

Monocle.pieceLoaded('compat');
