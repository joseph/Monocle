Monocle.Browser = {};

// Compare the user-agent string to a string or regex pattern.
//
Monocle.Browser.uaMatch = function (test) {
  var ua = navigator.userAgent;
  if (typeof test == "string") { return ua.indexOf(test) >= 0; }
  return !!ua.match(test);
}


// Detect the browser engine and set boolean flags for reference.
//
Monocle.Browser.is = {
  IE: !!(
    (window.attachEvent && !Monocle.Browser.uaMatch('Opera')) ||
    // IE 11
    (window.navigator.appName == 'Netscape' && Monocle.Browser.uaMatch('Trident'))
  ),
  Opera: Monocle.Browser.uaMatch('Opera'),
  WebKit: Monocle.Browser.uaMatch(/Apple\s?WebKit/),
  Gecko: Monocle.Browser.uaMatch(/Gecko\//),
  MobileSafari: Monocle.Browser.uaMatch(/OS \d_.*AppleWebKit.*Mobile/)
}


// Set the browser engine string.
//
if (Monocle.Browser.is.IE) {
  Monocle.Browser.engine = "IE";
} else if (Monocle.Browser.is.Opera) {
  Monocle.Browser.engine = "Opera";
} else if (Monocle.Browser.is.WebKit) {
  Monocle.Browser.engine = "WebKit";
} else if (Monocle.Browser.is.Gecko) {
  Monocle.Browser.engine = "Gecko";
} else {
  console.warn("Unknown engine; assuming W3C compliant.");
  Monocle.Browser.engine = "W3C";
}


// Detect the client platform (typically device/operating system).
//
Monocle.Browser.on = {
  iPhone: Monocle.Browser.is.MobileSafari && screen.width == 320,
  iPad: Monocle.Browser.is.MobileSafari && screen.width == 768,
  UIWebView: (
    Monocle.Browser.is.MobileSafari &&
    !Monocle.Browser.uaMatch('Safari') &&
    !navigator.standalone
  ),
  BlackBerry: Monocle.Browser.uaMatch('BlackBerry'),
  Android: (
    Monocle.Browser.uaMatch('Android') ||
    Monocle.Browser.uaMatch('Silk') ||
    Monocle.Browser.uaMatch(/Linux;.*EBRD/) // Sony Readers
  ),
  MacOSX: (
    Monocle.Browser.uaMatch('Mac OS X') &&
    !Monocle.Browser.is.MobileSafari
  ),
  Kindle3: Monocle.Browser.uaMatch(/Kindle\/3/)
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


if (Monocle.Browser.is.IE) {
  (function () {
    var version = navigator.userAgent.match(/(rv:|MSIE )(\d*\.\d*)/)[2];
    Monocle.Browser.ieVersion = Number(version);
  })();
}


// Some browser environments are too slow or too problematic for
// special animation effects.
//
// FIXME: These tests are too opinionated. Replace with more targeted tests.
//
Monocle.Browser.renders = (function () {
  var ua = navigator.userAgent;
  var caps = {};
  caps.eInk = Monocle.Browser.on.Kindle3;
  caps.slow = (
    caps.eInk ||
    (Monocle.Browser.on.Android && !ua.match(/Chrome/)) ||
    Monocle.Browser.on.Blackberry ||
    ua.match(/NintendoBrowser/)
  );
  return caps;
})();


// During Reader initialization, this method is called to create the
// "environment", which tests for the existence of various browser
// features and bugs, then invokes the callback to continue initialization.
//
// If the survey has already been conducted and the env exists, calls
// callback immediately.
//
Monocle.Browser.survey = function (callback) {
  if (!Monocle.Browser.env) {
    Monocle.Browser.css = new Monocle.CSS();
    Monocle.Browser.env = new Monocle.Env();
    Monocle.Browser.env.survey(callback);
  } else if (typeof callback == "function") {
    callback();
  }
}
