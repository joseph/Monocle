Monocle.Browser = { engine: 'W3C' }

Monocle.Browser.is = {
  IE: (!!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1)) &&
    (Monocle.Browser.engine = "IE"),
  Opera: navigator.userAgent.indexOf('Opera') > -1 &&
    (Monocle.Browser.engine = "Opera"),
  WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1 &&
    (Monocle.Browser.engine = "WebKit"),
  Gecko: navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1 &&
    (Monocle.Browser.engine = "Gecko"),
  MobileSafari: !!navigator.userAgent.match(/AppleWebKit.*Mobile/)
} // ... with thanks to PrototypeJS.


Monocle.Browser.on = {
  iPhone: navigator.userAgent.indexOf("iPhone") != -1,
  iPad: navigator.userAgent.indexOf("iPad") != -1,
  BlackBerry: navigator.userAgent.indexOf("BlackBerry") != -1,
  Android: navigator.userAgent.indexOf('Android') != -1,
  Kindle3: navigator.userAgent.match(/Kindle\/3/)
  // TODO: Mac, Windows, etc
}


// It is only because MobileSafari is responsible for so much anguish that
// we special-case it here. Not a badge of honour.
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
Monocle.Browser.iOSVersionBelow = function (strOrNum) {
  return Monocle.Browser.iOSVersion && Monocle.Browser.iOSVersion < strOrNum;
}


Monocle.Browser.CSSProps = {
  engines: ["W3C", "WebKit", "Gecko", "Opera", "IE", "Konqueror"],
  prefixes: ["", "-webkit-", "-moz-", "-o-", "-ms-", "-khtml-"],
  domprefixes: ["", "Webkit", "Moz", "O", "ms", "Khtml"],
  guineapig: document.createElement('div')
}


Monocle.Browser.CSSProps.capStr = function (wd) {
  return wd ? wd.charAt(0).toUpperCase() + wd.substr(1) : "";
}


// If second argument is not null, returns just a single string representing
// the JavaScript version of the CSS property (eg, 'WebkitBackgroundSize'
// from 'background-size'). Note that this means you can pass an empty string
// to get the W3C DOM version of the property (ie, 'backgroundSize').
//
// If no second argument, then an array of all known prefixes is returned,
// in the order of Monocle.Browser.CSSProps.domprefixes (see above).
//
Monocle.Browser.CSSProps.toDOMProps = function (prop, prefix) {
  var parts = prop.split('-');
  for (var i = parts.length; i > 0; --i) {
    parts[i] = Monocle.Browser.CSSProps.capStr(parts[i]);
  }

  if (typeof(prefix) != 'undefined' && prefix != null) {
    if (prefix) {
      parts[0] = Monocle.Browser.CSSProps.capStr(parts[0]);
      return prefix+parts.join('');
    } else {
      return parts.join('');
    }
  }

  var props = [parts.join('')];
  parts[0] = Monocle.Browser.CSSProps.capStr(parts[0]);
  for (i = 0; i < Monocle.Browser.CSSProps.prefixes.length; ++i) {
    var pf = Monocle.Browser.CSSProps.domprefixes[i];
    if (!pf) { continue; }
    props.push(pf+parts.join(''));
  }
  return props;
}


// Returns the appropriate DOM version of the CSS property for the
// current browser.
//
Monocle.Browser.CSSProps.toDOMProp = function (prop) {
  return Monocle.Browser.CSSProps.toDOMProps(
    prop,
    Monocle.Browser.CSSProps.domprefixes[
      Monocle.Browser.CSSProps.engines.indexOf(Monocle.Browser.engine)
    ]
  );
}


Monocle.Browser.CSSProps.isSupported = function (props) {
  for (var i in props) {
    if (Monocle.Browser.CSSProps.guineapig.style[props[i]] !== undefined) {
      return true;
    }
  }
  return false;
} // Thanks modernizr!


Monocle.Browser.CSSProps.isSupportedForAnyPrefix = function (prop) {
  return Monocle.Browser.CSSProps.isSupported(
    Monocle.Browser.CSSProps.toDOMProps(prop)
  );
}


Monocle.Browser.CSSProps.supportsMediaQuery = function (query) {
  var gpid = "monocle_guineapig";
  var div = Monocle.Browser.CSSProps.guineapig;
  div.id = gpid;
  var st = document.createElement('style');
  st.textContent = query+'{#'+gpid+'{height:3px}}';
  (document.head || document.getElementsByTagName('head')[0]).appendChild(st);
  document.documentElement.appendChild(div);

  var result = Monocle.Browser.CSSProps.guineapig.offsetHeight === 3;

  st.parentNode.removeChild(st);
  div.parentNode.removeChild(div);

  return result;
} // Thanks modernizr!


Monocle.Browser.CSSProps.supportsMediaQueryProperty = function (prop) {
  return Monocle.Browser.CSSProps.supportsMediaQuery(
    '@media ('+Monocle.Browser.CSSProps.prefixes.join(prop+'),(')+'monocle__)'
  );
}



Monocle.Browser.has = {}
Monocle.Browser.has.touch = ('ontouchstart' in window) ||
  Monocle.Browser.CSSProps.supportsMediaQueryProperty('touch-enabled');
Monocle.Browser.has.columns = Monocle.Browser.CSSProps.isSupportedForAnyPrefix(
  'column-width'
);
Monocle.Browser.has.transform3d = Monocle.Browser.CSSProps.isSupported([
  'perspectiveProperty',
  'WebkitPerspective',
  'MozPerspective',
  'OPerspective',
  'msPerspective'
]) && Monocle.Browser.CSSProps.supportsMediaQueryProperty('transform-3d');
Monocle.Browser.has.iframeTouchBug = Monocle.Browser.iOSVersionBelow("4.2");
Monocle.Browser.has.selectThruBug = Monocle.Browser.iOSVersionBelow("4.2");
Monocle.Browser.has.mustScrollSheaf = Monocle.Browser.is.MobileSafari;
Monocle.Browser.has.iframeDoubleWidthBug = Monocle.Browser.has.mustScrollSheaf;
Monocle.Browser.has.floatColumnBug = Monocle.Browser.is.WebKit;


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


Monocle.pieceLoaded('compat');
