Monocle.Env = function () {

  var API = { constructor: Monocle.Env }
  var k = API.constants = API.constructor;
  var p = API.properties = {}

  // These are private variables so they don't clutter up properties.
  var css = Monocle.Browser.css;
  var activeTestName = null;
  var frameLoadCallback = null;
  var testFrame = null;
  var testFrameLoadedWithStandard = false;
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
    console.log("["+activeTestName+"] "+val);
    API[activeTestName] = val;
    runNextTest();
  }


  // Invoked after all tests have run.
  //
  function completed() {
    if (testFrame && testFrame.parentNode) {
      testFrame.parentNode.removeChild(testFrame);
    }
    if (typeof surveyCallback == "function") {
      surveyCallback();
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

    if (typeof src == "undefined") {
      if (testFrameLoadedWithStandard) {
        frameLoadCallback(testFrame);
      } else {
        testFrameLoadedWithStandard = true;
        src = 4;
      }
    }

    if (typeof src == "number") {
      var pgs = [];
      for (var i = 1, ii = src; i <= ii; ++i) {
        pgs.push("<div>Page "+i+"</div>");
      }
      var divStyle = [
        "display:inline-block",
        "line-height:"+testFrameSize*2+"px",
        "background:#090"
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
    var box = document.createElement('div');
    box.className = "problemBox";
    box.style.cssText = [
      "width:"+testFrameSize+"px",
      "height:"+testFrameSize+"px",
      "overflow:hidden",
      "position:absolute",
      "visibility:hidden"
    ].join(";");
    document.body.appendChild(box);

    var fr = document.createElement('iframe');
    box.appendChild(fr);
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
        var bdy = fr.contentDocument.body;
        bdy.style.cssText = ([
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
        if (bodyDimensions(fr).height > testFrameSize) {
          bdy.style.cssText += ["min-width:200%", "overflow:hidden"].join(";");
          if (bodyDimensions(fr).height <= testFrameSize) {
            bdy.className = "column-force";
          } else {
            bdy.className = "column-failed "+bodyDimensions(fr).height;
          }
        }
        frameLoadCallback(fr);
      },
      false
    );
    return fr;
  }


  function bodyDimensions(fr) {
    var doc = fr.contentDocument;
    var dims = {
      width: doc.documentElement.scrollWidth,
      height: doc.documentElement.scrollHeight
    }
    if (dims.width <= testFrameSize) {
      dims.width = doc.body.scrollWidth;
      dims.height = doc.body.scrollHeight;
    }
    return dims;
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

    // Does the device have a MobileSafari-style touch interface?
    //
    ["touch", function () {
      result(
        ('ontouchstart' in window) ||
        css.supportsMediaQueryProperty('touch-enabled')
      );
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
    // the columns. A bug has been lodged.
    //
    // FIXME: Detection not yet implemented.
    ["floatsIgnoreColumns", testNotYetImplemented(false)],

    // The latest engines all agree that if a body is translated leftwards,
    // its scrollWidth is shortened. But some older WebKits (notably iOS4)
    // do not subtract translateX values from scrollWidth. In this case,
    // we should not add the translate back when calculating the width.
    //
    ["widthsIgnoreTranslate", function () {
      loadTestFrame(function (fr) {
        var firstWidth = bodyDimensions(fr).width;
        var s = fr.contentDocument.body.style;
        var props = css.toDOMProps("transform");
        for (var i = 0, ii = props.length; i < ii; ++i) {
          s[props[i]] = "translateX(-600px)";
        }
        var secondWidth = bodyDimensions(fr).width;
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
    // FIXME: Detection not yet implemented.
    ["relativeIframeExpands", testNotYetImplemented(false)],

    // Some combination of Webkit and OSX 10.6 cause a flicker during slider
    // "jumps" (ie, when the page instantly moves to a different translate
    // position).
    //
    // Workaround involves giving these jumps a tiny (but not zero) duration.
    //
    ["flickersOnJump", function () {
      result(Monocle.Browser.on.MacOSX && Monocle.Browser.is.WebKit);
    }],


    // TEST FOR OTHER QUIRKY BROWSER BEHAVIOUR

    // Older versions of WebKit (iOS3, Kindle3) need a min-width set on the
    // body of the iframe at 200%. This forces columns. But when this
    // min-width is set, it's more difficult to recognise 1 page components,
    // so we generally don't want to force it unless we have to.
    //
    // FIXME: This is not detecting correctly for iOS3.
    ["forceColumns", function () {
      loadTestFrame(function (fr) {
        var bdy = fr.contentDocument.body;
        result(bdy.className ? true : false);
      });
    }],

    // FIXME: This is not detecting correctly for Gecko (should be false) or
    // iOS3 (should be true).
    ["iframeWidthFromBody", function () {
      loadTestFrame(function (fr) {
        //console.log(fr.contentDocument.documentElement.scrollWidth);
        //console.log(fr.contentDocument.body.scrollWidth);
        result(fr.contentDocument.documentElement.scrollWidth <= testFrameSize);
        //result(true);
      })
    }],

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

    // In iOS5, a normal translateX on the iframe body comes up blank when
    // going backwards. translate3d doesn't have this problem. Should probably
    // isolate and file a Radar bug.
    //
    ["translateIframeIn3d", function () {
      result(
        Monocle.Browser.is.MobileSafari &&
        !Monocle.Browser.iOSVersionBelow("5")
      );
    }]
  ];


  API.survey = survey;

  return API;
}



Monocle.pieceLoaded('compat/env');
