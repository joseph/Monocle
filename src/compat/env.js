Monocle.Env = function (callback) {

  var API = { constructor: Monocle.Env }
  var k = API.constants = API.constructor;
  var p = API.properties = {}


  /*
   TODO:

   Implement tests for required basics:

   - supportsW3CEvents
   - supportsCustomEvents
   - supportsColumns


   Implement tests for optional basics:

   - supportsXPath
   - supportsQuerySelector


   Check out our context:

   - embedded


   Implement tests for bugs:

   - brokenIframeTouchModel
   - selectIgnoresZOrder
   - floatsIgnoreColumns (this has been disabled in Reader - reenable it!)
   - widthsIgnoreTranslate


   Implement tests for quirks:
   - forceColumns
   - iframeWidthFromBody
   - findNodesByScrolling
   - sheafIsScroller
   - translateIframeIn3d


   Run all tests during initialisation, assign results directly to API.
  */

  var pass = function () { return true; }
  var flunk = function () { return false; }

  p.tests = [
    ["supportsW3CEvents", pass],
    ["supportsCustomEvents", pass],
    ["supportsColumns", pass],

    ["supportsXPath", pass],
    ["supportsQuerySelector", pass],

    ["embedded", flunk],

    ["brokenIframeTouchModel", flunk],
    ["selectIgnoresZOrder", flunk],
    ["floatsIgnoreColumns", flunk],
    ["widthsIgnoreTranslate", flunk],

    ["forceColumns", flunk],
    ["iframeWidthFromBody", flunk],
    ["findNodesByScrolling", flunk],
    ["sheafIsScroller", flunk],
    ["translateIframeIn3d", flunk]
  ];


  /* !!!!!!!!!!!!!!!!!!! OLD VERSION !!!!!!!!!!!!!!!!!!!!!!!!! */

  Monocle.Browser.has = {}

  Monocle.Browser.has.touch = ('ontouchstart' in window) ||
    Monocle.Browser.css.supportsMediaQueryProperty('touch-enabled');

  Monocle.Browser.has.columns =
    Monocle.Browser.css.supportsPropertyWithAnyPrefix('column-width');

  Monocle.Browser.has.transform3d = Monocle.Browser.css.supportsProperty([
    'perspectiveProperty',
    'WebkitPerspective',
    'MozPerspective',
    'OPerspective',
    'msPerspective'
  ]) && Monocle.Browser.css.supportsMediaQueryProperty('transform-3d');

  Monocle.Browser.has.embedded = (top != self);

  // iOS (at least up to version 4.1) makes a complete hash of touch events
  // when an iframe is overlapped by other elements. It's a dog's breakfast.
  // See test/bugs/ios-frame-touch-bug for details.
  //
  Monocle.Browser.has.iframeTouchBug = Monocle.Browser.iOSVersionBelow("4.2");

  // In early versions of iOS (up to 4.1), MobileSafari would send text-select
  // activity to the first iframe, even if that iframe is overlapped by a
  // "higher" iframe.
  //
  Monocle.Browser.has.selectThruBug = Monocle.Browser.iOSVersionBelow("4.2");

  // In MobileSafari browsers, iframes are rendered at the width and height of
  // their content, rather than having scrollbars. So in that case, it's the
  // containing element (the "sheaf") that must be scrolled, not the iframe
  // body.
  //
  // Relatedly, these browsers tend to need a min-width set on the body of the
  // iframe that is 200% -- this ensures that the body will have columns. But
  // when this min-width is set, it becomes much more difficult to detect 1
  // page components (since they will appear to be 2 pages wide). A different
  // algorithm is implemented for this case.
  //
  Monocle.Browser.has.mustScrollSheaf = Monocle.Browser.is.MobileSafari;
  Monocle.Browser.has.iframeDoubleWidthBug =
    Monocle.Browser.has.mustScrollSheaf || Monocle.Browser.on.Kindle3;

  // Webkit-based browsers put floated elements in the wrong spot when columns
  // are used -- they appear way down where they would be if there were no
  // columns.  Presumably the float positions are calculated before the
  // columns. A bug has been lodged.
  //
  // FIXME: Hooray, this is fixed in the latest Webkit nightlies. How to
  // detect?
  //
  Monocle.Browser.has.floatColumnBug = Monocle.Browser.is.WebKit;

  // On Android browsers, if the component iframe has a relative width (ie,
  // 100%), the width of the entire browser will keep expanding and expanding
  // to fit the width of the body of the iframe (which, with columns, is
  // massive). So, 100% is treated as "of the body content" rather than "of the
  // parent dimensions". In this scenario, we need to give the component iframe
  // a fixed width in pixels.
  //
  // In iOS, the frame is clipped by overflow:hidden, so this doesn't seem to
  // be a problem.
  //
  Monocle.Browser.has.relativeIframeWidthBug = Monocle.Browser.on.Android;


  // Some combination of Webkit and OSX 10.6 cause a flicker during slider
  // "jumps" (ie, when the page instantly moves to a different translate
  // position).
  //
  // Workaround involves giving these jumps a tiny (but not zero) duration.
  //
  Monocle.Browser.has.jumpFlickerBug =
    Monocle.Browser.on.MacOSX && Monocle.Browser.is.WebKit;


  function initialize() {
    for (var i = 0, ii = p.tests.length; i < ii; ++i) {
      var test = p.tests[i];
      API[test[0]] = test[1]();
    }
    if (typeof callback == "function") { callback(); }
  }



  initialize();

  return API;
}



Monocle.pieceLoaded('compat/env');
