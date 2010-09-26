// READER
//
//
// The full DOM hierarchy created by Reader is:
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
//
// Options:
//
//  flipper: The class of page flipper to use.
//  panels: The class of panels to use
//  place: A book locus for the page to open to when the reader is
//    initialized. (See comments at Book#pageNumberAt for more about
//    the locus option).
//  systemId: the id for root elements of components, defaults to "RS:monocle"
//
//
Monocle.Reader = function (node, bookData, options, onLoadCallback) {
  if (Monocle == this) {
    return new Monocle.Reader(node, bookData, options, onLoadCallback);
  }

  var API = { constructor: Monocle.Reader }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    // Registered control objects (see addControl). Hashes of the form:
    //   {
    //     control: <control instance>,
    //     elements: <array of topmost elements created by control>,
    //     controlType: <standard, page, modal, popover, invisible, etc>
    //   }
    controls: [],

    // The active book.
    book: null,

    // Properties relating to the input events.
    interactionData: {},

    // A resettable timer which must expire before dimensions are recalculated
    // after the reader has been resized.
    //
    resizeTimer: null,

    // An array of style rules that are automatically applied to every page.
    pageStylesheets: [],

    // DOM graph of factory-generated objects.
    graph: {},

    // Id applied to the HTML element of each component, can be used to scope
    // CSS rules.
    systemId: (options ? options.systemId : null) || k.DEFAULT_SYSTEM_ID,

    // Prefix for classnames for any created element.
    classPrefix: k.DEFAULT_CLASS_PREFIX
  }

  var dom;


  // Sets up the container and internal elements.
  //
  function initialize(node, bookData, options, onLoadCallback) {
    var box = typeof(node) == "string" ?  document.getElementById(node) : node;
    dom = API.dom = box.dom = new Monocle.Factory(box, 'box', 0, API);

    options = options || {}

    dispatchEvent("monocle:initializing");

    var bk;
    if (bookData) {
      bk = new Monocle.Book(bookData);
    } else {
      bk = Monocle.Book.fromNodes([box.cloneNode(true)]);
    }
    box.innerHTML = "";

    // Make sure the box div is absolutely or relatively positioned.
    positionBox();

    // Attach the page-flipping gadget.
    attachFlipper(options.flipper);

    // Create the essential DOM elements.
    createReaderElements();

    // Clamp page frames to a set of styles that reduce Monocle breakage.
    p.defaultStyles = addPageStyles(k.DEFAULT_STYLE_RULES, false);

    primeFrames(options.primeURL, function () {
      // Make the reader elements look pretty.
      applyStyles();

      listen('monocle:componentchange', persistPageStylesOnComponentChange);

      p.flipper.listenForInteraction(options.panels);

      // Apply the book, calculating column dimensions & etc.
      p.book = bk;
      calcDimensions(options.place)

      Monocle.defer(function () {
        if (onLoadCallback) {
          onLoadCallback(API);
        }
        dispatchEvent("monocle:loaded");
      });
    });
  }


  function positionBox() {
    var currPosVal;
    var box = dom.find('box');
    if (document.defaultView) {
      var currStyle = document.defaultView.getComputedStyle(box, null);
      currPosVal = currStyle.getPropertyValue('position');
    } else if (box.currentStyle) {
      currPosVal = box.currentStyle.position
    }
    if (["absolute", "relative"].indexOf(currPosVal) == -1) {
      box.style.position = "relative";
    }
  }


  function createReaderElements() {
    var cntr = dom.append('div', 'container');
    for (var i = 0; i < p.flipper.pageCount; ++i) {
      var page = cntr.dom.append('div', 'page', i);
      page.m = { reader: API, pageIndex: i, place: null }
      page.m.sheafDiv = page.dom.append('div', 'sheaf', i);
      page.m.activeFrame = page.m.sheafDiv.dom.append('iframe', 'component', i);
      // FIXME: clunky
      page.m.activeFrame.m = { 'pageDiv': page }
      p.flipper.addPage(page);
      // BROWSERHACK: hook up the iframe to the touchmonitor if it exists.
      Monocle.Events.listenOnIframe(page.m.activeFrame);
    }
    dom.append('div', 'overlay');
    dispatchEvent("monocle:loading");
  }


  // Opens the frame to a particular URL (usually 'about:blank').
  //
  function primeFrames(url, callback) {
    url = url || "about:blank";

    var pageMax = p.flipper.pageCount;
    var pageCount = 0;
    for (var i = 0; i < pageMax; ++i) {
      var page = dom.find('page', i);
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
        return dom.append(
          'div',
          'abortMsg',
          { 'class': k.abortMessage.CLASSNAME, 'html': k.abortMessage.TEXT }
        );
        return;
      }
    } else if (!flipperClass) {
      flipperClass = Monocle.Flippers[k.FLIPPER_DEFAULT_CLASS];
      if (!flipperClass) {
        throw("No flipper class");
      }
    }
    p.flipper = new flipperClass(API, null, p.readerOptions);
  }


  function applyStyles() {
    dom.find('container').dom.setStyles(Monocle.Styles.container);
    for (var i = 0; i < p.flipper.pageCount; ++i) {
      var page = dom.find('page', i);
      page.dom.setStyles(Monocle.Styles.page);
      dom.find('sheaf', i).dom.setStyles(Monocle.Styles.sheaf);
      var cmpt = dom.find('component', i)
      cmpt.dom.setStyles(Monocle.Styles.component);
      Monocle.Styles.applyRules(cmpt.contentDocument.body, Monocle.Styles.body);
    }
    dom.find('overlay').dom.setStyles(Monocle.Styles.overlay);
    dispatchEvent('monocle:styles');
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
    var box = dom.find('box');
    p.boxDimensions = {
      left: 0,
      top: 0,
      width: box.offsetWidth,
      height: box.offsetHeight
    }
    var o = box;
    do {
      p.boxDimensions.left += o.offsetLeft;
      p.boxDimensions.top += o.offsetTop;
    } while (o = o.offsetParent);

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
    var cntr = dom.find('container'), overlay = dom.find('overlay');
    if (!cType || cType == "standard") {
      ctrlElem = ctrl.createControlElements(cntr);
      cntr.appendChild(ctrlElem);
      ctrlData.elements.push(ctrlElem);
    } else if (cType == "page") {
      for (var i = 0; i < p.flipper.pageCount; ++i) {
        var page = dom.find('page', i);
        var runner = ctrl.createControlElements(page);
        page.appendChild(runner);
        ctrlData.elements.push(runner);
      }
    } else if (cType == "modal" || cType == "popover") {
      ctrlElem = ctrl.createControlElements(overlay);
      overlay.appendChild(ctrlElem);
      ctrlData.elements.push(ctrlElem);
      ctrlData.usesOverlay = true;
    } else if (cType == "invisible") {
      if (
        typeof(ctrl.createControlElements) == "function" &&
        (ctrlElem = ctrl.createControlElements(cntr))
      ) {
        cntr.appendChild(ctrlElem);
        ctrlData.elements.push(ctrlElem);
      }
    } else {
      console.warn("Unknown control type: " + cType);
    }

    for (var i = 0; i < ctrlData.elements.length; ++i) {
      Monocle.Styles.applyRules(ctrlData.elements[i], Monocle.Styles.control);
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
      var overlay = dom.find('overlay');
      overlay.style.display = "none";
      Monocle.Events.deafenForContact(overlay, overlay.listeners);
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
    var overlay = dom.find('overlay');
    if (controlData.usesOverlay) {
      overlay.style.display = "block";
    }
    if (controlData.controlType == "popover") {
      overlay.listeners = Monocle.Events.listenForContact(
        overlay,
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
    evt.m = data;
    return dom.find('box').dispatchEvent(evt);
  }


  function listen(evtType, fn, useCapture) {
    Monocle.Events.listen(dom.find('box'), evtType, fn, useCapture);
  }


  function deafen(evtType, fn) {
    Monocle.Events.deafen(dom.find('box'), evtType, fn);
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

      for (var i = 0; i < p.flipper.pageCount; ++i) {
        var doc = dom.find('component', i).contentDocument;
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
      for (var i = 0; i < p.flipper.pageCount; ++i) {
        var doc = dom.find('component', i).contentDocument;
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
      for (var i = 0; i < p.flipper.pageCount; ++i) {
        var doc = dom.find('component', i).contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        styleTag.parentNode.removeChild(styleTag);
      }
    }, recalcDimensions);
  }


  // Called when a page changes its component. Injects our current page
  // stylesheets into the new component.
  //
  function persistPageStylesOnComponentChange(evt) {
    var doc = evt.m['document'];
    doc.documentElement.id = p.systemId;
    for (var i = 0; i < p.pageStylesheets.length; ++i) {
      if (p.pageStylesheets[i]) {
        addPageStylesheet(doc, i);
      }
    }
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

    var head = doc.getElementsByTagName('head')[0];
    if (!head) {
      head = doc.createElement('head');
      doc.documentElement.appendChild(head);
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

    head.appendChild(styleTag);

    return styleTag;
  }



  API.getBook = getBook;
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

  initialize(node, bookData, options, onLoadCallback);

  return API;
}

Monocle.Reader.durations = {
  RESIZE_DELAY: 100
}
Monocle.Reader.abortMessage = {
  CLASSNAME: "monocleAbortMessage",
  TEXT: "Your browser does not support this technology."
}
Monocle.Reader.DEFAULT_SYSTEM_ID = 'RS:monocle'
Monocle.Reader.DEFAULT_CLASS_PREFIX = 'monelem_'
Monocle.Reader.FLIPPER_DEFAULT_CLASS = "Slider";
Monocle.Reader.FLIPPER_LEGACY_CLASS = "Legacy";
Monocle.Reader.TOUCH_DEVICE = (typeof Touch == "object");
Monocle.Reader.DEFAULT_STYLE_RULES = [
  "html * {" +
    "text-rendering: optimizeSpeed !important;" +
    "word-wrap: break-word !important;" +
    (Monocle.Browser.has.floatColumnBug ? "float: none !important;" : "") +
  "}" +
  "body {" +
    "margin: 0 !important;" +
    "padding: 0 !important;" +
    "-webkit-text-size-adjust: none;" +
  "}" +
  "table, img {" +
    "max-width: 100% !important;" +
    "max-height: 90% !important;" +
  "}"
]


Monocle.pieceLoaded('reader');
