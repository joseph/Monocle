/* READER */

// Options:
//
//  flipper: The class of page flipper to use.
//  place: A book locus for the page to open to when the reader is initialized.
//
Monocle.Reader = function (node, bookData, options) {
  if (Monocle == this) { return new Monocle.Reader(node, bookData, options); }

  // Constants.
  var k = {
    durations: {
      RESIZE_DELAY: 200
    },
    abortMessage: {
      CLASSNAME: "monocleAbortMessage",
      TEXT: "Your browser does not support this technology."
    },
    FLIPPER_DEFAULT_CLASS: (typeof(Monocle.Flippers.Slider) == "undefined") ?
      null :
      Monocle.Flippers.Slider,
    FLIPPER_LEGACY_CLASS: (typeof(Monocle.Flippers.Legacy) == "undefined") ?
      null :
      Monocle.Flippers.Legacy,
    TOUCH_DEVICE: (typeof Touch == "object"),
    DEFAULT_STYLE_RULES: [
      "body * {" +
        "float: none !important;" +
        "clear: none !important;" +
      "}",
      "table, img {" +
        "max-width: 100% !important;" +
        "max-height: 90% !important;" +
      "}"
    ]
  }

  // Properties.
  var p = {
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

  // Methods and properties available to external code.
  var API = {
    constructor: Monocle.Reader,
    properties: p,
    constants: k
  }


  // Sets up the container and internal elements.
  //
  function initialize(node, bookData, options) {
    p.divs.box = typeof(node) == "string" ?
      document.getElementById(node) :
      node;

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
    p.defaultStyles = addPageStyles(k.DEFAULT_STYLE_RULES);

    // Create the essential DOM elements.
    createReaderElements(function () {
      // Make the reader elements look pretty.
      applyStyles();

      addListener(
        'monocle:componentchange',
        function (evt) {
          var doc = evt.monocleData['document'];
          applyPageStyles(doc);
          Monocle.Styles.applyRules(doc.body, 'body');
        }
      );

      // Apply the book, calculating column dimensions & etc.
      setBook(bk, options.place);

      p.flipper.listenForInteraction();

      dispatchEvent("monocle:loaded")
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
      page.m.activeFrame.style.visibility = "hidden";
      if (options.primeURL) {
        if (callback) {
          page.m.activeFrame.onload = function () {
            p.pagesLoaded = p.pagesLoaded + 1 || 1;
            if (p.pagesLoaded == p.flipper.pageCount) {
              callback();
            }
          }
        }
        page.m.activeFrame.src = options.primeURL;
      }
      page.appendChild(page.m.sheafDiv);
      page.m.sheafDiv.appendChild(page.m.activeFrame);
      p.flipper.addPage(page);
      p.divs.container.appendChild(page);
    }
    p.divs.overlay = document.createElement('div');
    p.divs.box.appendChild(p.divs.overlay);
    dispatchEvent("monocle:loading");
    if (callback && !options.primeURL) {
      callback();
    }
  }


  function attachFlipper(flipperClass) {
    // BROWSERHACK: WEBKIT + GECKO (CSS columns, basic HTML5/CSS3 support)
    if (navigator.product != "Gecko") { // FIXME: browser sniffing is a smell
      if (!k.FLIPPER_LEGACY_CLASS) {
        var abortMsg = document.createElement('div');
        abortMsg.className = k.abortMessage.CLASSNAME;
        abortMsg.innerHTML = k.abortMessage.TEXT;
        p.divs.box.appendChild(abortMsg);
        return;
      }
      flipperClass = k.FLIPPER_LEGACY_CLASS;
    } else if (!flipperClass) {
      flipperClass = k.FLIPPER_DEFAULT_CLASS;
      if (!flipperClass) {
        throw("No flipper class");
      }
    }
    p.flipper = new flipperClass(API, setPage);
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

    var onChangePage = function (rslt) {
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

    return p.book.changePage(pageDiv, locus, onChangePage);
  }


  /*
  function listenForInteraction(layer) {
    // BROWSERHACK: Mobile Webkit? (Touch event support)
    if (!k.TOUCH_DEVICE) {
      Monocle.addListener(
        layer,
        'mousedown',
        function (evt) {
          if (evt.button != 0) {
            return;
          }
          p.interactionData.mouseDown = true;
          contactEvent(evt, "start", evt);
        }
      );
      Monocle.addListener(
        layer,
        'mousemove',
        function (evt) {
          if (!p.interactionData.mouseDown) {
            return false;
          }
          contactEvent(evt, "move", evt);
        }
      );
      Monocle.addListener(
        layer,
        'mouseup',
        function (evt) {
          if (!p.interactionData.mouseDown) {
            return false;
          }
          contactEvent(evt, "end", evt);
        }
      );
      Monocle.addListener(
        layer,
        'mouseout',
        function (evt) {
          if (!p.interactionData.mouseDown) {
            return false;
          }
          obj = evt.relatedTarget || e.fromElement;
          while (obj && (obj = obj.parentNode)) {
            if (obj == p.divs.box) { return; }
          }
          contactEvent(evt, 'end', evt);
        }
      );
    } else {
      Monocle.addListener(
        layer,
        'touchstart',
        function (evt) {
          if (evt.touches.length > 1) { return; }
          contactEvent(evt, 'start', evt.targetTouches[0]);
          evt.preventDefault();
        }
      );
      Monocle.addListener(
        layer,
        'touchmove',
        function (evt) {
          if (evt.touches.length > 1) { return; }
          var raw = {
            x: evt.targetTouches[0].pageX - p.boxDimensions.left,
            y: evt.targetTouches[0].pageY - p.boxDimensions.top,
            w: p.boxDimensions.width,
            h: p.boxDimensions.height
          }
          if (raw.x < 0 || raw.y < 0 || raw.x >= raw.w || raw.y >= raw.h) {
            contactEvent(evt, "end", evt.targetTouches[0]);
          } else {
            contactEvent(evt, "move", evt.targetTouches[0]);
          }
          evt.preventDefault();
        }
      );
      Monocle.addListener(
        layer,
        'touchend',
        function (evt) {
          contactEvent(evt, "end", evt.changedTouches[0]);
          evt.preventDefault();
        }
      );
      Monocle.addListener(
        layer,
        'touchcancel',
        function (evt) {
          contactEvent(evt, "end", evt.changedTouches[0]);
        }
      );
      Monocle.addListener(window, 'orientationchange', resized, true);
    }

    Monocle.addListener(
      document,
      'keydown',
      function (evt) {
        console.log(evt.keyCode);
        if (evt.keyCode == 18) {
          console.log("hiding control layer");
          layer.style.display = "none";
        }
      }
    );
    Monocle.addListener(
      document,
      'keyup',
      function (evt) {
        console.log(evt.keyCode);
        if (evt.keyCode == 18) {
          console.log("showing control layer");
          layer.style.display = "block";
        }
      }
    );
  }


  // In general, flippers will listen for the basic contact events, and
  // preventDefault if they use them. Controls should listen for unhandled
  // contact events, which are triggered if the flipper does not
  // preventDefault the event.
  //
  function contactEvent(evt, eType, cursorInfo) {
    cData = {
      contactX: Math.min(
        p.boxDimensions.width,
        Math.max(0, cursorInfo.pageX - p.boxDimensions.left)
      ),
      contactY: Math.min(
        p.boxDimensions.height,
        Math.max(0, cursorInfo.pageY - p.boxDimensions.top)
      )
    };

    if (dispatchEvent("monocle:contact:"+eType, cData, true)) {
      dispatchEvent("monocle:contact:"+eType+":unhandled", cData, true)
    }

    evt.preventDefault();

    if (eType == "end") {
      p.interactionData = {};
    }
  }
  */


  /* Valid types:
   *  - standard (an overlay above the pages)
   *  - page (within the page)
   *  - modal (overlay where click-away does nothing)
   *  - popover (overlay where click-away removes the ctrl elements)
   *  - invisible
   *
   * Options:
   *  - hidden -- creates and hides the ctrl elements;
   *              use showControl to show them
   */
  function addControl(ctrl, cType, options) {
    for (var i = 0; i < p.controls.length; ++i) {
      if (p.controls[i].control == ctrl) {
        console.log("Already added control: " + ctrl);
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
      console.log("Unknown control type: " + cType);
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
      throw("No data for control: " + ctrl);
    }
    if (controlData.hidden) {
      return;
    }
    for (var i = 0; i < controlData.elements.length; ++i) {
      controlData.elements[i].style.display = "none";
    }
    if (controlData.usesOverlay) {
      p.divs.overlay.style.display = "none";
      var evtType = k.TOUCH_DEVICE ? "touchstart" : "mousedown";
      Monocle.removeListener(p.divs.overlay, evtType, p.divs.overlay.clickFn);
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
      throw("No data for control: " + ctrl);
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
      p.divs.overlay.clickFn = function (evt) {
        obj = evt.target || window.event.srcElement;
        do {
          if (obj == controlData.elements[0]) { return true; }
        } while (obj && (obj = obj.parentNode));
        hideControl(ctrl);
      }
      var evtType = k.TOUCH_DEVICE ? "touchstart" : "mousedown";
      Monocle.addListener(p.divs.overlay, evtType, p.divs.overlay.clickFn);
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


  function addListener(evtType, fn, useCapture) {
    Monocle.addListener(p.divs.box, evtType, fn, useCapture);
  }


  function removeListener(evtType, fn) {
    Monocle.removeListener(p.divs.box, evtType, fn);
  }


  function addPageStyles(styleRules) {
    p.pageStylesheets.push(styleRules);
    var sheetIndex = p.pageStylesheets.length - 1;

    for (var i = 0; i < p.divs.pages.length; ++i) {
      var doc = p.divs.pages[i].m.activeFrame.contentDocument;
      addPageStylesheet(doc, sheetIndex);
    }

    if (p.divs.pages.length) { calcDimensions(); }
    return sheetIndex;
  }


  function updatePageStyles(sheetIndex, styleRules) {
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

    if (p.divs.pages.length) { calcDimensions(); }
  }


  function removePageStyles(sheetIndex) {
    p.pageStylesheets[sheetIndex] = null;
    for (var i = 0; i < p.divs.pages.length; ++i) {
      var doc = p.divs.pages[i].m.activeFrame.contentDocument;
      var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
      styleTag.parentNode.removeChild(styleTag);
    }
    if (p.divs.pages.length) { calcDimensions(); }
  }


  function applyPageStyles(doc) {
    for (var i = 0; i < p.pageStylesheets.length; ++i) {
      if (p.pageStylesheets[i]) {
        addPageStylesheet(doc, i);
      }
    }
  }


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
  API.addListener = addListener;
  API.removeListener = removeListener;
  API.addPageStyles = addPageStyles;
  API.updatePageStyles = updatePageStyles;
  API.removePageStyles = removePageStyles;

  initialize(node, bookData, options);

  return API;
}

Monocle.pieceLoaded('reader');
