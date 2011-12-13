Monocle.Env = function () {

  var API = { constructor: Monocle.Env }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    // Assign to a function before running survey in order to get
    // results as they come in. The function should take two arguments:
    // testName and value.
    resultCallback: null
  }

  // These are private variables so they don't clutter up properties.
  var css = Monocle.Browser.css;
  var activeTestName = null;
  var frameLoadCallback = null;
  var testFrame = null;
  var testFrameCntr = null;
  var testFrameSize = 100;
  var surveyCallback = null;


  function survey(cb) {
    surveyCallback = cb;
    runNextTest();
  }


  function runNextTest() {
    var test = envTests.shift();
    if (!test) { return completed(); }
    activeTestName = test[0];
    try { test[1](); } catch (e) { result(e); }
  }


  // Each test should call this to say "I'm finished, run the next test."
  //
  function result(val) {
    //console.log("["+activeTestName+"] "+val);
    API[activeTestName] = val;
    if (p.resultCallback) { p.resultCallback(activeTestName, val); }
    runNextTest();
    return val;
  }


  // Invoked after all tests have run.
  //
  function completed() {
    // Remove the test frame after a slight delay (otherwise Gecko spins).
    Monocle.defer(removeTestFrame);

    if (typeof surveyCallback == "function") {
      surveyCallback(API);
    }
  }


  // A bit of sugar for simplifying a detection pattern: does this
  // function exist?
  //
  // Pass a string snippet of JavaScript to be evaluated.
  //
  function testForFunction(str) {
    return function () { result(typeof eval(str) == "function"); }
  }


  // A bit of sugar to indicate that the detection function for this test
  // hasn't been written yet...
  //
  // Pass the value you want assigned for the test until it is implemented.
  //
  function testNotYetImplemented(rslt) {
    return function () { result(rslt); }
  }



  // Loads (or reloads) a hidden iframe so that we can test browser features.
  //
  // cb is the callback that is fired when the test frame's content is loaded.
  //
  // src is optional, in which case it defaults to 4. If provided, it can be
  // a number (specifying the number of pages of default content), or a string,
  // which will be loaded as a URL.
  //
  function loadTestFrame(cb, src) {
    if (!testFrame) { testFrame = createTestFrame(); }
    frameLoadCallback = cb;

    src = src || 4;

    if (typeof src == "number") {
      var pgs = [];
      for (var i = 1, ii = src; i <= ii; ++i) {
        pgs.push("<div>Page "+i+"</div>");
      }
      var divStyle = [
        "display:inline-block",
        "line-height:"+testFrameSize+"px",
        "width:"+testFrameSize+"px"
      ].join(";");
      src = "javascript:'<!DOCTYPE html><html>"+
        '<head><meta name="time" content="'+(new Date()).getTime()+'" />'+
        '<style>div{'+divStyle+'}</style></head>'+
        '<body>'+pgs.join("")+'</body>'+
        "</html>'";
    }

    testFrame.src = src;
  }


  // Creates the hidden test frame and returns it.
  //
  function createTestFrame() {
    testFrameCntr = document.createElement('div');
    testFrameCntr.style.cssText = [
      "width:"+testFrameSize+"px",
      "height:"+testFrameSize+"px",
      "overflow:hidden",
      "position:absolute",
      "visibility:hidden"
    ].join(";");
    document.body.appendChild(testFrameCntr);

    var fr = document.createElement('iframe');
    testFrameCntr.appendChild(fr);
    fr.setAttribute("scrolling", "no");
    fr.style.cssText = [
      "width:100%",
      "height:100%",
      "border:none",
      "background:#900"
    ].join(";");
    fr.addEventListener(
      "load",
      function () {
        if (!fr.contentDocument || !fr.contentDocument.body) { return; }
        var bd = fr.contentDocument.body;
        bd.style.cssText = ([
          "margin:0",
          "padding:0",
          "position:absolute",
          "height:100%",
          "width:100%",
          "-webkit-column-width:"+testFrameSize+"px",
          "-webkit-column-gap:0",
          "-moz-column-width:"+testFrameSize+"px",
          "-moz-column-gap:0",
          "-o-column-width:"+testFrameSize+"px",
          "-o-column-gap:0",
          "column-width:"+testFrameSize+"px",
          "column-gap:0"
        ].join(";"));
        if (bd.scrollHeight > testFrameSize) {
          bd.style.cssText += ["min-width:200%", "overflow:hidden"].join(";");
          if (bd.scrollHeight <= testFrameSize) {
            bd.className = "column-force";
          } else {
            bd.className = "column-failed "+bd.scrollHeight;
          }
        }
        frameLoadCallback(fr);
      },
      false
    );
    return fr;
  }


  function removeTestFrame() {
    if (testFrameCntr && testFrameCntr.parentNode) {
      testFrameCntr.parentNode.removeChild(testFrameCntr);
    }
  }


  function columnedWidth(fr) {
    var bd = fr.contentDocument.body;
    var de = fr.contentDocument.documentElement;
    return Math.max(bd.scrollWidth, de.scrollWidth);
  }


  var envTests = [

    // TEST FOR REQUIRED CAPABILITIES

    ["supportsW3CEvents", testForFunction("window.addEventListener")],
    ["supportsCustomEvents", testForFunction("document.createEvent")],
    ["supportsColumns", function () {
      result(css.supportsPropertyWithAnyPrefix('column-width'));
    }],
    ["supportsTransform", function () {
      result(css.supportsProperty([
        'transformProperty',
        'WebkitTransform',
        'MozTransform',
        'OTransform',
        'msTransform'
      ]));
    }],


    // TEST FOR OPTIONAL CAPABILITIES

    // Does it do CSS transitions?
    ["supportsTransition", function () {
      result(css.supportsPropertyWithAnyPrefix('transition'))
    }],

    // Can we find nodes in a document with an XPath?
    //
    ["supportsXPath", testForFunction("document.evaluate")],

    // Can we find nodes in a document natively with a CSS selector?
    //
    ["supportsQuerySelector", testForFunction("document.querySelector")],

    // Can we do 3d transforms?
    //
    ["supportsTransform3d", function () {
      result(
        css.supportsMediaQueryProperty('transform-3d') &&
        css.supportsProperty([
          'perspectiveProperty',
          'WebkitPerspective',
          'MozPerspective',
          'OPerspective',
          'msPerspective'
        ])
      );
    }],


    // CHECK OUT OUR CONTEXT

    // Does the device have a MobileSafari-style touch interface?
    //
    ["touch", function () {
      result(
        ('ontouchstart' in window) ||
        css.supportsMediaQueryProperty('touch-enabled')
      );
    }],

    // Is the Reader embedded, or in the top-level window?
    //
    ["embedded", function () { result(top != self) }],


    // TEST FOR CERTAIN RENDERING OR INTERACTION BUGS

    // iOS (at least up to version 4.1) makes a complete hash of touch events
    // when an iframe is overlapped by other elements. It's a dog's breakfast.
    // See test/bugs/ios-frame-touch-bug for details.
    //
    ["brokenIframeTouchModel", function () {
      result(Monocle.Browser.iOSVersionBelow("4.2"));
    }],

    // In early versions of iOS (up to 4.1), MobileSafari would send text-select
    // activity to the first iframe, even if that iframe is overlapped by a
    // "higher" iframe.
    //
    ["selectIgnoresZOrder", function () {
      result(Monocle.Browser.iOSVersionBelow("4.2"));
    }],

    // Webkit-based browsers put floated elements in the wrong spot when
    // columns are used -- they appear way down where they would be if there
    // were no columns.  Presumably the float positions are calculated before
    // the columns. A bug has been lodged, and it's fixed in recent WebKits.
    //
    ["floatsIgnoreColumns", function () {
      if (!Monocle.Browser.is.WebKit) { return result(false); }
      match = navigator.userAgent.match(/AppleWebKit\/([\d\.]+)/);
      if (!match) { return result(false); }
      return result(match[1] < "534.30");
    }],

    // The latest engines all agree that if a body is translated leftwards,
    // its scrollWidth is shortened. But some older WebKits (notably iOS4)
    // do not subtract translateX values from scrollWidth. In this case,
    // we should not add the translate back when calculating the width.
    //
    ["widthsIgnoreTranslate", function () {
      loadTestFrame(function (fr) {
        var firstWidth = columnedWidth(fr);
        var s = fr.contentDocument.body.style;
        var props = css.toDOMProps("transform");
        for (var i = 0, ii = props.length; i < ii; ++i) {
          s[props[i]] = "translateX(-600px)";
        }
        var secondWidth = columnedWidth(fr);
        for (i = 0, ii = props.length; i < ii; ++i) {
          s[props[i]] = "none";
        }
        result(secondWidth == firstWidth);
      });
    }],

    // On Android browsers, if the component iframe has a relative width (ie,
    // 100%), the width of the entire browser will keep expanding and expanding
    // to fit the width of the body of the iframe (which, with columns, is
    // massive). So, 100% is treated as "of the body content" rather than "of
    // the parent dimensions". In this scenario, we need to give the component
    // iframe a fixed width in pixels.
    //
    // In iOS, the frame is clipped by overflow:hidden, so this doesn't seem to
    // be a problem.
    //
    ["relativeIframeExpands", function () {
      result(navigator.userAgent.indexOf("Android 2") >= 0);
    }],

    // iOS3 will pause JavaScript execution if it gets a style-change + a
    // scroll change on a component body. Weirdly, this seems to break GBCR
    // in iOS4.
    //
    ["scrollToApplyStyle", function () {
      result(Monocle.Browser.iOSVersionBelow("4"));
    }],


    // TEST FOR OTHER QUIRKY BROWSER BEHAVIOUR

    // Older versions of WebKit (iOS3, Kindle3) need a min-width set on the
    // body of the iframe at 200%. This forces columns. But when this
    // min-width is set, it's more difficult to recognise 1 page components,
    // so we generally don't want to force it unless we have to.
    //
    ["forceColumns", function () {
      loadTestFrame(function (fr) {
        var bd = fr.contentDocument.body;
        result(bd.className ? true : false);
      });
    }],

    // A component iframe's body is absolutely positioned. This means that
    // the documentElement should have a height of 0, since it contains nothing
    // other than an absolutely positioned element.
    //
    // But for some browsers (Gecko and Opera), the documentElement is as
    // wide as the full columned content, and the body is only as wide as
    // the iframe element (ie, the first column).
    //
    // It gets weirder. Gecko sometimes behaves like WebKit (not clipping the
    // body) IF the component has been loaded via HTML/JS/Nodes, not URL. Still
    // can't reproduce outside Monocle.
    //
    // FIXME: If we can figure out a reliable behaviour for Gecko, we should
    // use it to precalculate the workaround. At the moment, this test isn't
    // used, but it belongs in src/dimensions/columns.js#columnedDimensions().
    //
    // ["iframeBodyWidthClipped", function () {
    //   loadTestFrame(function (fr) {
    //     var doc = fr.contentDocument;
    //     result(
    //       doc.body.scrollWidth <= testFrameSize &&
    //       doc.documentElement.scrollWidth > testFrameSize
    //     );
    //   })
    // }],

    // Finding the page that a given HTML node is on is typically done by
    // calculating the offset of its rectange from the body's rectangle.
    //
    // But if this information isn't provided by the browser, we need to use
    // node.scrollIntoView and check the scrollOffset. Basically iOS3 is the
    // only target platform that doesn't give us the rectangle info.
    //
    ["findNodesByScrolling", function () {
      result(typeof document.body.getBoundingClientRect !== "function");
    }],

    // In MobileSafari browsers, iframes are rendered at the width and height
    // of their content, rather than having scrollbars. So in that case, it's
    // the containing element (the "sheaf") that must be scrolled, not the
    // iframe body.
    //
    ["sheafIsScroller", function () {
      loadTestFrame(function (fr) {
        result(fr.parentNode.scrollWidth > testFrameSize);
      });
    }],

    // For some reason, iOS MobileSafari sometimes loses track of a page after
    // slideOut -- it thinks it has an x-translation of 0, rather than -768 or
    // whatever. So the page gets "stuck" there, until it is given a non-zero
    // x-translation. The workaround is to set a non-zero duration on the jumpIn,
    // which seems to force WebKit to recalculate the x of the page. Weird, yeah.
    //
    ["stickySlideOut", function () {
      result(Monocle.Browser.is.MobileSafari);
    }]

  ];


  function isCompatible() {
    return (
      API.supportsW3CEvents &&
      API.supportsCustomEvents &&
      // API.supportsColumns &&     // This is coming in 3.0!
      API.supportsTransform
    );
  }


  API.survey = survey;
  API.isCompatible = isCompatible;

  return API;
}



Monocle.pieceLoaded('compat/env');
