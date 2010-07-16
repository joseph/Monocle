/* READER */

// Options:
//
//  flipper: The class of page flipper to use.
//  place: A book locus for the page to open to when the reader is initialized.
//
Monocle.Reader = function (node, bookData, options) {
  if (Monocle == this) { return new Monocle.Reader(node, bookData, options); }

  var API = { constructor: Monocle.Reader }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    // Divs only stores the box, the container and the two pages. But the full
    // hierarchy (at this time) is:
    //
    //   box
    //    -> container
    //      -> pages (the number of page elements is determined by the flipper)
    //        -> sheaf (basically just sets the margins)
    //          -> component (an iframe created by the current component)
    //            -> body (the document.body of the iframe)
    //        -> page controls
    //      -> standard controls
    //    -> overlay
    //      -> modal/popover controls
    //
    divs: {
      box: null,
      container: null,
      overlay: null,
      pages: []
    },

    // Registered control objects (see addControl). Hashes of the form:
    //   {
    //     control: <control instance>,
    //     elements: <array of topmost elements created by control>,
    //     controlType: <standard, page, modal, popover, invisible, etc>
    //   }
    controls: [],

    // The current width of the page.
    pageWidth: 0,

    // The active book.
    book: null,

    // Properties relating to the input events.
    interactionData: {},

    // A resettable timer which must expire before dimensions are recalculated
    // after the reader has been resized.
    //
    resizeTimer: null,

    // An array of style rules that are automatically applied to every page.
    pageStylesheets: []
  }


  // Sets up the container and internal elements.
  //
  function initialize(node, bookData, options) {
    p.divs.box = typeof(node) == "string" ?
      document.getElementById(node) :
      node;
    p.divs.box.setAttribute('monocle', 'reader');

    options = options || {}

    dispatchEvent("monocle:initializing");

    var bk;
    if (bookData) {
      bk = new Monocle.Book(bookData);
    } else {
      bk = Monocle.Book.fromNodes([p.divs.box.cloneNode(true)]);
    }
    p.divs.box.innerHTML = "";

    // Make sure the box div is absolutely or relatively positioned.
    positionBox();

    // Attach the page-flipping gadget.
    attachFlipper(options.flipper);

    // Clamp page frames to a set of styles that reduce Monocle breakage.
    p.defaultStyles = addPageStyles(k.DEFAULT_STYLE_RULES, false);

    // Create the essential DOM elements.
    createReaderElements();

    primeFrames(options.primeURL, function () {
      // Make the reader elements look pretty.
      applyStyles();

      listen(
        'monocle:componentchange',
        function (evt) {
          var doc = evt.monocleData['document'];
          for (var i = 0; i < p.pageStylesheets.length; ++i) {
            if (p.pageStylesheets[i]) {
              addPageStylesheet(doc, i);
            }
          }
          Monocle.Styles.applyRules(doc.body, 'body');
        }
      );

      // Apply the book, calculating column dimensions & etc.
      setBook(bk, options.place);

      p.flipper.listenForInteraction(options.panels);

      Monocle.defer(function () { dispatchEvent("monocle:loaded"); });
    });
  }


  function positionBox() {
    var currPosVal;
    if (document.defaultView) {
      var currStyle = document.defaultView.getComputedStyle(p.divs.box, null);
      currPosVal = currStyle.getPropertyValue('position');
    } else if (p.divs.box.currentStyle) {
      currPosVal = p.divs.box.currentStyle.position
    }
    if (["absolute", "relative"].indexOf(currPosVal) == -1) {
      p.divs.box.style.position = "relative";
    }
  }


  function createReaderElements(callback) {
    p.divs.container = document.createElement('div');
    p.divs.box.appendChild(p.divs.container);
    for (var i = 0; i < p.flipper.pageCount; ++i) {
      var page = p.divs.pages[i] = document.createElement('div');
      page.m = page.monocleData = {
        reader: API,
        pageIndex: i,
        sheafDiv: document.createElement('div'),
        activeFrame: document.createElement('iframe'),
        place: null
      }
      page.m.activeFrame.m = page.m.activeFrame.monocleData = {
        'pageDiv': page
      }
      page.appendChild(page.m.sheafDiv);
      page.m.sheafDiv.appendChild(page.m.activeFrame);
      p.flipper.addPage(page);
      p.divs.container.appendChild(page);
    }
    p.divs.overlay = document.createElement('div');
    p.divs.box.appendChild(p.divs.overlay);
    dispatchEvent("monocle:loading");
  }


  // Opens the frame to a particular URL, so that offline-caching works with
  // that URL, and base hrefs work.
  function primeFrames(url, callback) {
    url = url || "about:blank";

    var pageMax = p.divs.pages.length;
    var pageCount = 0;
    for (var i = 0; i < pageMax; ++i) {
      var page = p.divs.pages[i];
      page.m.activeFrame.style.visibility = "hidden";
      page.m.activeFrame.style.position = "absolute";
      var cb = function (evt) {
        var frame = evt.target || evt.srcElement;
        Monocle.Events.deafen(frame, 'load', cb);
        if (Monocle.Browser.is.WebKit) {
          frame.contentDocument.documentElement.style.overflow = "hidden";
        }
        if ((pageCount +=1) == pageMax) {
          callback();
        }
      }
      Monocle.Events.listen(page.m.activeFrame, 'load', cb);
      page.m.activeFrame.src = url;
    }
  }


  function attachFlipper(flipperClass) {
    // BROWSERHACK: Supported browsers must do CSS columns (at least?).
    if (!Monocle.Browser.has.columns) {
      flipperClass = Monocle.Flippers[k.FLIPPER_LEGACY_CLASS];
      if (!flipperClass) {
        var abortMsg = document.createElement('div');
        abortMsg.className = k.abortMessage.CLASSNAME;
        abortMsg.innerHTML = k.abortMessage.TEXT;
        p.divs.box.appendChild(abortMsg);
        return;
      }
    } else if (!flipperClass) {
      flipperClass = Monocle.Flippers[k.FLIPPER_DEFAULT_CLASS];
      if (!flipperClass) {
        throw("No flipper class");
      }
    }
    p.flipper = new flipperClass(API, setPage, p.readerOptions);
  }


  function applyStyles() {
    Monocle.Styles.applyRules(p.divs.container, 'container');
    for (var i = 0; i < p.flipper.pageCount; ++i) {
      var page = p.divs.pages[i];
      Monocle.Styles.applyRules(page, 'page');
      Monocle.Styles.applyRules(page.m.sheafDiv, 'sheaf');
      Monocle.Styles.applyRules(page.m.activeFrame, 'component');
      Monocle.Styles.applyRules(
        page.m.activeFrame.contentDocument.body,
        'body'
      );
    }
    Monocle.Styles.applyRules(p.divs.overlay, 'overlay');
    dispatchEvent('monocle:styles');
  }


  function reapplyStyles() {
    applyStyles();
    calcDimensions();
  }


  // Changes the current book for this reader.
  //
  //  bk - must be a valid book-data object
  //  locus - OPTIONAL. The locus (see book.js) to open the book to.
  //
  function setBook(bk, locus) {
    if (!dispatchEvent("monocle:bookchanging", {}, true)) {
      return;
    }
    p.book = bk;
    calcDimensions(locus);
    dispatchEvent("monocle:bookchange");
    return p.book;
  }


  function getBook() {
    return p.book;
  }


  function resized() {
    if (!dispatchEvent("monocle:resizing", {}, true)) {
      return;
    }
    clearTimeout(p.resizeTimer);
    p.resizeTimer = setTimeout(
      function () {
        calcDimensions();
        dispatchEvent("monocle:resize");
      },
      k.durations.RESIZE_DELAY
    );
  }


  // Note: locus argument is OPTIONAL. Defaults to "current page".
  //
  function calcDimensions(locus) {
    locus = locus || { page: pageNumber() };
    p.boxDimensions = {
      left: 0,
      top: 0,
      width: p.divs.box.offsetWidth,
      height: p.divs.box.offsetHeight
    }
    var o = p.divs.box;
    do {
      p.boxDimensions.left += o.offsetLeft;
      p.boxDimensions.top += o.offsetTop;
    } while (o = o.offsetParent);

    if (typeof(p.flipper.overrideDimensions) != 'function') {
      var measuringPage = p.flipper.visiblePages()[0];
      p.pageWidth = measuringPage.offsetWidth;
    } else {
      p.flipper.overrideDimensions();
    }

    moveTo(locus);
  }


  // Returns the current page number in the book.
  //
  // The pageDiv argument is optional - typically defaults to whatever the
  // flipper thinks is the "active" page.
  //
  function pageNumber(pageDiv) {
    var place = p.flipper.getPlace(pageDiv);
    return place ? (place.pageNumber() || 1) : 1;
  }


  // Returns the current "place" in the book -- ie, the page number, chapter
  // title, etc.
  //
  // The pageDiv argument is optional - typically defaults to whatever the
  // flipper thinks is the "active" page.
  //
  function getPlace(pageDiv) {
    return p.flipper.getPlace(pageDiv);
  }


  // Moves the current page as specified by the locus. See
  // Monocle.Book#changePage for documentation on the locus argument.
  //
  function moveTo(locus) {
    p.flipper.moveTo(locus);
  }


  // Moves to the relevant element in the relevant component.
  //
  function skipToChapter(src) {
    moveTo(p.book.locusOfChapter(src));
  }


  // Private method that tells the book to update the given pageElement to
  // the given page.
  //
  // This method is handed over to the flipper, which calls it with a
  // callback to do the actual display change.
  //
  function setPage(pageDiv, locus, callback) {
    var eData = { page: pageDiv, locus: locus }

    // Other things may disallow page change.
    if (!dispatchEvent('monocle:pagechanging', eData, true)) {
      return;
    }

    var onChange = function (rslt) {
      // The book may disallow changing to the given page.
      if (rslt === 'disallow') {
        callback(rslt);
        return rslt;
      }

      callback(rslt.offset);

      eData.pageNumber = rslt.page;
      eData.componentId = rslt.componentId;
      dispatchEvent("monocle:pagechange", eData);
    }

    p.book.changePage(pageDiv, locus, onChange);
  }


  // Valid types:
  //  - standard (an overlay above the pages)
  //  - page (within the page)
  //  - modal (overlay where click-away does nothing)
  //  - popover (overlay where click-away removes the ctrl elements)
  //  - invisible
  //
  // Options:
  //  - hidden -- creates and hides the ctrl elements;
  //              use showControl to show them
  //
  function addControl(ctrl, cType, options) {
    for (var i = 0; i < p.controls.length; ++i) {
      if (p.controls[i].control == ctrl) {
        console.warn("Already added control: " + ctrl);
        return;
      }
    }

    options = options || {};

    var ctrlData = {
      control: ctrl,
      elements: [],
      controlType: cType
    }
    p.controls.push(ctrlData);

    var ctrlElem;
    if (!cType || cType == "standard") {
      ctrlElem = ctrl.createControlElements(p.divs.container);
      p.divs.container.appendChild(ctrlElem);
      ctrlData.elements.push(ctrlElem);
    } else if (cType == "page") {
      for (var i = 0; i < p.divs.pages.length; ++i) {
        var cDiv = p.divs.pages[i];
        var runner = ctrl.createControlElements(cDiv);
        cDiv.appendChild(runner);
        ctrlData.elements.push(runner);
      }
    } else if (cType == "modal" || cType == "popover") {
      ctrlElem = ctrl.createControlElements(p.divs.overlay);
      p.divs.overlay.appendChild(ctrlElem);
      ctrlData.elements.push(ctrlElem);
      ctrlData.usesOverlay = true;
    } else if (cType == "invisible") {
      if (
        typeof(ctrl.createControlElements) == "function" &&
        (ctrlElem = ctrl.createControlElements(p.divs.container))
      ) {
        p.divs.container.appendChild(ctrlElem);
        ctrlData.elements.push(ctrlElem);
      }
    } else {
      console.warn("Unknown control type: " + cType);
    }

    for (var i = 0; i < ctrlData.elements.length; ++i) {
      ctrlData.elements[i].style.cssText += Monocle.Styles.ruleText('control');
    }

    if (options.hidden) {
      hideControl(ctrl);
    } else {
      showControl(ctrl);
    }

    if (typeof ctrl.assignToReader == 'function') {
      ctrl.assignToReader(API);
    }

    return ctrl;
  }


  function dataForControl(ctrl) {
    for (var i = 0; i < p.controls.length; ++i) {
      if (p.controls[i].control == ctrl) {
        return p.controls[i];
      }
    }
  }


  function hideControl(ctrl) {
    var controlData = dataForControl(ctrl);
    if (!controlData) {
      console.warn("No data for control: " + ctrl);
      return;
    }
    if (controlData.hidden) {
      return;
    }
    for (var i = 0; i < controlData.elements.length; ++i) {
      controlData.elements[i].style.display = "none";
    }
    if (controlData.usesOverlay) {
      p.divs.overlay.style.display = "none";
      Monocle.Events.deafenForContact(p.divs.overlay, p.divs.overlay.listeners);
    }
    controlData.hidden = true;
    if (ctrl.properties) {
      ctrl.properties.hidden = true;
    }
    dispatchEvent('controlhide', ctrl, false);
  }


  function showControl(ctrl) {
    var controlData = dataForControl(ctrl);
    if (!controlData) {
      console.warn("No data for control: " + ctrl);
      return;
    }
    if (controlData.hidden == false) {
      return;
    }
    for (var i = 0; i < controlData.elements.length; ++i) {
      controlData.elements[i].style.display = "block";
    }
    if (controlData.usesOverlay) {
      p.divs.overlay.style.display = "block";
    }
    if (controlData.controlType == "popover") {
      p.divs.overlay.listeners = Monocle.Events.listenForContact(
        p.divs.overlay,
        {
          start: function (evt) {
            obj = evt.target || window.event.srcElement;
            do {
              if (obj == controlData.elements[0]) { return true; }
            } while (obj && (obj = obj.parentNode));
            hideControl(ctrl);
          }
        }
      );
    }
    controlData.hidden = false;
    if (ctrl.properties) {
      ctrl.properties.hidden = false;
    }
    dispatchEvent('controlshow', ctrl, false);
  }


  // Internet Explorer does not permit custom events; we'll wait for a
  // version of IE that supports the W3C model.
  //
  function dispatchEvent(evtType, data, cancelable) {
    if (!document.createEvent) {
      return true;
    }
    var evt = document.createEvent("Events");
    evt.initEvent(evtType, false, cancelable || false);
    evt.m = evt.monocleData = data;
    return p.divs.box.dispatchEvent(evt);
  }


  function listen(evtType, fn, useCapture) {
    Monocle.Events.listen(p.divs.box, evtType, fn, useCapture);
  }


  function deafen(evtType, fn) {
    Monocle.Events.deafen(p.divs.box, evtType, fn);
  }



  /* PAGE STYLESHEETS */

  // API for adding a new stylesheet to all components. styleRules should be
  // a string of CSS rules. recalcDimensions defaults to true.
  //
  // Returns a sheet index value that can be used with updatePageStyles
  // and removePageStyles.
  //
  function addPageStyles(styleRules, recalcDimensions) {
    return changingStylesheet(function () {
      p.pageStylesheets.push(styleRules);
      var sheetIndex = p.pageStylesheets.length - 1;

      for (var i = 0; i < p.divs.pages.length; ++i) {
        var doc = p.divs.pages[i].m.activeFrame.contentDocument;
        addPageStylesheet(doc, sheetIndex);
      }
      return sheetIndex;
    }, recalcDimensions);
  }


  // API for updating the styleRules in an existing page stylesheet across
  // all components. Takes a sheet index value obtained via addPageStyles.
  //
  function updatePageStyles(sheetIndex, styleRules, recalcDimensions) {
    return changingStylesheet(function () {
      p.pageStylesheets[sheetIndex] = styleRules;
      if (typeof styleRules.join == "function") {
        styleRules = styleRules.join("\n");
      }
      for (var i = 0; i < p.divs.pages.length; ++i) {
        var doc = p.divs.pages[i].m.activeFrame.contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        if (styleTag.styleSheet) {
          styleTag.styleSheet.cssText = styleRules;
        } else {
          styleTag.replaceChild(
            doc.createTextNode(styleRules),
            styleTag.firstChild
          );
        }
      }
    }, recalcDimensions);
  }


  // API for removing a page stylesheet from all components. Takes a sheet
  // index value obtained via addPageStyles.
  //
  function removePageStyles(sheetIndex, recalcDimensions) {
    return changingStylesheet(function () {
      p.pageStylesheets[sheetIndex] = null;
      for (var i = 0; i < p.divs.pages.length; ++i) {
        var doc = p.divs.pages[i].m.activeFrame.contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        styleTag.parentNode.removeChild(styleTag);
      }
    }, recalcDimensions);
  }


  // Wraps all API-based stylesheet changes (add, update, remove) in a
  // brace of custom events (stylesheetchanging/stylesheetchange), and
  // recalculates component dimensions if specified (default to true).
  //
  function changingStylesheet(callback, recalcDimensions) {
    recalcDimensions = (recalcDimensions === false) ? false : true;
    if (recalcDimensions) {
      dispatchEvent("monocle:stylesheetchanging", {});
    }
    var result = callback();
    if (recalcDimensions) {
      calcDimensions();
      Monocle.defer(
        function () { dispatchEvent("monocle:stylesheetchange", {}); }
      );
    }
    return result;
  }


  // Private method for adding a stylesheet to a component. Used by
  // addPageStyles.
  //
  function addPageStylesheet(doc, sheetIndex) {
    var styleRules = p.pageStylesheets[sheetIndex];
    if (!styleRules) {
      return;
    }

    if (typeof styleRules.join == "function") {
      styleRules = styleRules.join("\n");
    }

    var styleTag = doc.createElement('style');
    styleTag.type = 'text/css';
    styleTag.id = "monStylesheet"+sheetIndex;
    if (styleTag.styleSheet) {
      styleTag.styleSheet.cssText = styleRules;
    } else {
      styleTag.appendChild(doc.createTextNode(styleRules));
    }

    doc.getElementsByTagName('head')[0].appendChild(styleTag);

    return styleTag;
  }



  API.setBook = setBook;
  API.getBook = getBook;
  API.reapplyStyles = reapplyStyles;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.skipToChapter = skipToChapter;
  API.resized = resized;
  API.addControl = addControl;
  API.hideControl = hideControl;
  API.showControl = showControl;
  API.dispatchEvent = dispatchEvent;
  API.listen = listen;
  API.deafen = deafen;
  API.addPageStyles = addPageStyles;
  API.updatePageStyles = updatePageStyles;
  API.removePageStyles = removePageStyles;

  initialize(node, bookData, options);

  return API;
}

Monocle.Reader.durations = {
  RESIZE_DELAY: 100
}
Monocle.Reader.abortMessage = {
  CLASSNAME: "monocleAbortMessage",
  TEXT: "Your browser does not support this technology."
}
Monocle.Reader.FLIPPER_DEFAULT_CLASS = "Slider";
Monocle.Reader.FLIPPER_LEGACY_CLASS = "Legacy";
Monocle.Reader.TOUCH_DEVICE = (typeof Touch == "object");
Monocle.Reader.DEFAULT_STYLE_RULES = [
  // "body {" +
  //   "user-select: none !important;" +
  //   "-moz-user-select: none !important;" +
  //   "-webkit-user-select: none !important;" +
  // "}" +
  "body * {" +
    "float: none !important;" +
    "clear: none !important;" +
  "}",
  "table, img {" +
    "max-width: 100% !important;" +
    "max-height: 90% !important;" +
  "}"
]


Monocle.pieceLoaded('reader');
