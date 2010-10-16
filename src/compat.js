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
  iPad: navigator.userAgent.indexOf("iPad") != -1,
  BlackBerry: navigator.userAgent.indexOf("BlackBerry") != -1,
  Kindle3: navigator.userAgent.match(/Kindle\/3/)
  // TODO: Mac, Windows, etc
}


Monocle.Browser.has = {
  touch: (function () {
    try {
      document.createEvent("TouchEvent");
      return true;
    } catch (e) {
      return false;
    }
  })(),
  columns: Monocle.Browser.is.WebKit || Monocle.Browser.is.Gecko, // FIXME!
  transform3d: Monocle.Browser.is.WebKit, // FIXME!
  iframeTouchBug: Monocle.Browser.is.MobileSafari &&
    Monocle.Browser.iOSVersion &&
    Monocle.Browser.iOSVersion < "4.3",
  selectThruBug: Monocle.Browser.is.MobileSafari &&
    Monocle.Browser.iOSVersion &&
    Monocle.Browser.iOSVersion < "4.2",
  iframeWidthBug: Monocle.Browser.on.iPhone ||
    Monocle.Browser.on.iPad,
  floatColumnBug: Monocle.Browser.is.WebKit
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


  // A weak version of console.dir that works on iOS.
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


}

Monocle.pieceLoaded('compat');
