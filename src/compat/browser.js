Monocle.Browser = {}

// Detect the browser engine and set boolean flags for reference.
//
Monocle.Browser.is = {
  IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  Opera: navigator.userAgent.indexOf('Opera') > -1,
  WebKit: navigator.userAgent.indexOf('AppleWebKit') > -1,
  Gecko: navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1,
  MobileSafari: !!navigator.userAgent.match(/AppleWebKit.*Mobile/)
} // ... with thanks to PrototypeJS.


if (Monocle.Browser.is.IE) {
  Monocle.Browser.engine = "IE";
} else if (Monocle.Browser.is.Opera) {
  Monocle.Browser.engine = "Opera";
} else if (Monocle.Browser.is.WebKit) {
  Monocle.Browser.engine = "WebKit";
} else if (Monocle.Browser.is.Gecko) {
  Monocle.Browser.engine = "Gecko";
} else {
  Monocle.Browser.engine = "W3C";
}


// Detect the client platform (typically device/operating system).
//
Monocle.Browser.on = {
  iPhone: Monocle.Browser.is.MobileSafari && screen.width == 320,
  iPad: Monocle.Browser.is.MobileSafari && screen.width == 768,
  UIWebView: Monocle.Browser.is.MobileSafari &&
    navigator.userAgent.indexOf("Safari") < 0 &&
    !navigator.standalone,
  BlackBerry: navigator.userAgent.indexOf("BlackBerry") != -1,
  Android: navigator.userAgent.indexOf('Android') != -1,
  MacOSX: navigator.userAgent.indexOf('Mac OS X') != -1 &&
    !Monocle.Browser.is.MobileSafari,
  Kindle3: !!navigator.userAgent.match(/Kindle\/3/)
  // TODO: Mac, Windows, etc
}


// It is only because MobileSafari is responsible for so much anguish that
// we special-case it here. Not a badge of honour.
//
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
  return !!Monocle.Browser.iOSVersion && Monocle.Browser.iOSVersion < strOrNum;
}


// A helper class for sniffing CSS features and creating CSS rules
// appropriate to the current rendering engine.
//
Monocle.Browser.css = new Monocle.CSS();


// During Reader initialization, this method is called to create the
// "environment", which tests for the existence of various browser
// features and bugs, then invokes the callback to continue initialization.
//
// If the survey has already been conducted and the env exists, calls
// callback immediately.
//
Monocle.Browser.survey = function (callback) {
  if (!Monocle.Browser.env) {
    Monocle.Browser.env = new Monocle.Env();
    Monocle.Browser.env.survey(callback);
  } else if (typeof callback == "function") {
    callback();
  }
}

Monocle.pieceLoaded('compat/browser');
