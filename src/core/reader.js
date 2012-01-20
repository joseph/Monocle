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
//
//  panels: The class of panels to use
//
//  stylesheet: A string of CSS rules to apply to the contents of each
//    component loaded into the reader.
//
//  place: A book locus for the page to open to when the reader is
//    initialized. (See comments at Book#pageNumberAt for more about
//    the locus option).
//
//  systemId: the id for root elements of components, defaults to "RS:monocle"
//
Monocle.Reader = function (node, bookData, options, onLoadCallback) {
  if (Monocle == this) {
    return new Monocle.Reader(node, bookData, options, onLoadCallback);
  }

  var API = { constructor: Monocle.Reader }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    // Initialization-completed flag.
    initialized: false,

    // The active book.
    book: null,

    // DOM graph of factory-generated objects.
    graph: {},

    // An array of style rules that are automatically applied to every page.
    pageStylesheets: [],

    // Id applied to the HTML element of each component, can be used to scope
    // CSS rules.
    systemId: (options ? options.systemId : null) || k.DEFAULT_SYSTEM_ID,

    // Prefix for classnames for any created element.
    classPrefix: k.DEFAULT_CLASS_PREFIX,

    // Registered control objects (see addControl). Hashes of the form:
    //   {
    //     control: <control instance>,
    //     elements: <array of topmost elements created by control>,
    //     controlType: <standard, page, modal, popover, invisible, etc>
    //   }
    controls: [],

    // After the reader has been resized, this resettable timer must expire
    // the place is restored.
    resizeTimer: null
  }

  var dom;


  // Inspects the browser environment and kicks off preparing the container.
  //
  function initialize() {
    options = options || {}

    Monocle.Browser.survey(prepareBox);
  }


  // Sets up the container and internal elements.
  //
  function prepareBox() {
    var box = node;
    if (typeof box == "string") { box = document.getElementById(box); }
    dom = API.dom = box.dom = new Monocle.Factory(box, 'box', 0, API);

    if (!Monocle.Browser.env.isCompatible()) {
      if (dispatchEvent("monocle:incompatible", {}, true)) {
        // TODO: Something cheerier? More informative?
        box.innerHTML = "Your browser is not compatible with Monocle.";
      }
      return;
    }

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
    clampStylesheets(options.stylesheet);

    primeFrames(options.primeURL, function () {
      // Make the reader elements look pretty.
      applyStyles();

      listen('monocle:componentmodify', persistPageStylesOnComponentChange);

      p.flipper.listenForInteraction(options.panels);

      setBook(bk, options.place, function () {
        p.initialized = true;
        if (onLoadCallback) { onLoadCallback(API); }
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


  function attachFlipper(flipperClass) {
    if (!flipperClass) {
      if (!Monocle.Browser.env.supportsColumns) {
        flipperClass = Monocle.Flippers.Legacy;
      } else if (Monocle.Browser.on.Kindle3) {
        flipperClass = Monocle.Flippers.Instant;
      }

      flipperClass = flipperClass || Monocle.Flippers.Slider;
    }

    if (!flipperClass) { throw("Flipper not found."); }

    p.flipper = new flipperClass(API, null, p.readerOptions);
  }


  function createReaderElements() {
    var cntr = dom.append('div', 'container');
    for (var i = 0; i < p.flipper.pageCount; ++i) {
      var page = cntr.dom.append('div', 'page', i);
      page.style.visibility = "hidden";
      page.m = { reader: API, pageIndex: i, place: null }
      page.m.sheafDiv = page.dom.append('div', 'sheaf', i);
      page.m.activeFrame = page.m.sheafDiv.dom.append('iframe', 'component', i);
      page.m.activeFrame.m = { 'pageDiv': page };
      page.m.activeFrame.setAttribute('frameBorder', 0);
      page.m.activeFrame.setAttribute('scrolling', 'no');
      p.flipper.addPage(page);
      // BROWSERHACK: hook up the iframe to the touchmonitor if it exists.
      Monocle.Events.listenOnIframe(page.m.activeFrame);
    }
    dom.append('div', 'overlay');
    dispatchEvent("monocle:loading");
  }


  function clampStylesheets(customStylesheet) {
    var defCSS = k.DEFAULT_STYLE_RULES;
    if (Monocle.Browser.env.floatsIgnoreColumns) {
      defCSS.push("html#RS\\:monocle * { float: none !important; }");
    }
    p.defaultStyles = addPageStyles(defCSS, false);
    if (customStylesheet) {
      p.initialStyles = addPageStyles(customStylesheet, false);
    }
  }


  // Opens the frame to a particular URL (usually 'about:blank').
  //
  function primeFrames(url, callback) {
    url = url || (Monocle.Browser.on.UIWebView ? "blank.html" : "about:blank");

    var pageCount = 0;

    var cb = function (evt) {
      var frame = evt.target || evt.srcElement;
      Monocle.Events.deafen(frame, 'load', cb);
      dispatchEvent(
        'monocle:frameprimed',
        { frame: frame, pageIndex: pageCount }
      );
      if ((pageCount += 1) == p.flipper.pageCount) {
        Monocle.defer(callback);
      }
    }

    forEachPage(function (page) {
      Monocle.Events.listen(page.m.activeFrame, 'load', cb);
      page.m.activeFrame.src = url;
    });
  }


  function applyStyles() {
    dom.find('container').dom.setStyles(Monocle.Styles.container);
    forEachPage(function (page, i) {
      page.dom.setStyles(Monocle.Styles.page);
      dom.find('sheaf', i).dom.setStyles(Monocle.Styles.sheaf);
      var cmpt = dom.find('component', i)
      cmpt.dom.setStyles(Monocle.Styles.component);
    });
    lockFrameWidths();
    dom.find('overlay').dom.setStyles(Monocle.Styles.overlay);
    dispatchEvent('monocle:styles');
  }


  function lockingFrameWidths() {
    if (!Monocle.Browser.env.relativeIframeExpands) { return; }
    for (var i = 0, cmpt; cmpt = dom.find('component', i); ++i) {
      cmpt.style.display = "none";
    }
  }


  function lockFrameWidths() {
    if (!Monocle.Browser.env.relativeIframeExpands) { return; }
    for (var i = 0, cmpt; cmpt = dom.find('component', i); ++i) {
      cmpt.style.width = cmpt.parentNode.offsetWidth+"px";
      cmpt.style.display = "block";
    }
  }


  // Apply the book, move to a particular place or just the first page, wait
  // for everything to complete, then fire the callback.
  //
  function setBook(bk, place, callback) {
    p.book = bk;
    var pageCount = 0;
    if (typeof callback == 'function') {
      var watchers = {
        'monocle:componentchange': function (evt) {
          dispatchEvent('monocle:firstcomponentchange', evt.m);
          return (pageCount += 1) == p.flipper.pageCount;
        },
        'monocle:turn': function (evt) {
          callback();
          return true;
        }
      }
      var listener = function (evt) {
        if (watchers[evt.type](evt)) { deafen(evt.type, listener); }
      }
      for (evtType in watchers) { listen(evtType, listener) }
    }
    p.flipper.moveTo(place || { page: 1 });
  }


  function getBook() {
    return p.book;
  }


  // Attempts to restore the place we were up to in the book before the
  // reader was resized.
  //
  function resized() {
    if (!p.initialized) {
      console.warn('Attempt to resize book before initialization.');
    }
    lockingFrameWidths();
    if (!dispatchEvent("monocle:resizing", {}, true)) {
      return;
    }
    clearTimeout(p.resizeTimer);
    p.resizeTimer = setTimeout(
      function () {
        lockFrameWidths();
        recalculateDimensions(true);
        dispatchEvent("monocle:resize");
      },
      k.RESIZE_DELAY
    );
  }


  function recalculateDimensions(andRestorePlace) {
    if (!p.book) { return; }
    dispatchEvent("monocle:recalculating");

    var place, locus;
    if (andRestorePlace !== false) {
      var place = getPlace();
      var locus = { percent: place ? place.percentageThrough() : 0 };
    }

    // Better to use an event? Or chaining consecutively?
    forEachPage(function (pageDiv) {
      pageDiv.m.activeFrame.m.component.updateDimensions(pageDiv);
    });

    Monocle.defer(function () {
      if (locus) { p.flipper.moveTo(locus); }
      dispatchEvent("monocle:recalculated");
    });
  }


  // Returns the current page number in the book.
  //
  // The pageDiv argument is optional - typically defaults to whatever the
  // flipper thinks is the "active" page.
  //
  function pageNumber(pageDiv) {
    var place = getPlace(pageDiv);
    return place ? (place.pageNumber() || 1) : 1;
  }


  // Returns the current "place" in the book -- ie, the page number, chapter
  // title, etc.
  //
  // The pageDiv argument is optional - typically defaults to whatever the
  // flipper thinks is the "active" page.
  //
  function getPlace(pageDiv) {
    if (!p.initialized) {
      console.warn('Attempt to access place before initialization.');
    }
    return p.flipper.getPlace(pageDiv);
  }


  // Moves the current page as specified by the locus. See
  // Monocle.Book#pageNumberAt for documentation on the locus argument.
  //
  // The callback argument is optional.
  //
  function moveTo(locus, callback) {
    if (!p.initialized) {
      console.warn('Attempt to move place before initialization.');
    }
    if (!p.book.isValidLocus(locus)) {
      dispatchEvent(
        "monocle:notfound",
        { href: locus ? locus.componentId : "anonymous" }
      );
      return false;
    }
    var fn = callback;
    if (!locus.direction) {
      dispatchEvent('monocle:jumping', { locus: locus });
      fn = function () {
        dispatchEvent('monocle:jump', { locus: locus });
        if (callback) { callback(); }
      }
    }
    p.flipper.moveTo(locus, fn);
    return true;
  }


  // Moves to the relevant element in the relevant component.
  //
  function skipToChapter(src) {
    var locus = p.book.locusOfChapter(src);
    return moveTo(locus);
  }


  // Valid types:
  //  - standard (an overlay above the pages)
  //  - page (within the page)
  //  - modal (overlay where click-away does nothing, for a single control)
  //  - hud (overlay that multiple controls can share)
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
      forEachPage(function (page, i) {
        var runner = ctrl.createControlElements(page);
        page.appendChild(runner);
        ctrlData.elements.push(runner);
      });
    } else if (cType == "modal" || cType == "popover" || cType == "hud") {
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
    dispatchEvent('monocle:controlhide', { control: ctrl }, false);
  }


  function showControl(ctrl) {
    var controlData = dataForControl(ctrl);
    if (!controlData) {
      console.warn("No data for control: " + ctrl);
      return false;
    }

    if (showingControl(ctrl)) {
      return false;
    }

    var overlay = dom.find('overlay');
    if (controlData.usesOverlay && controlData.controlType != "hud") {
      for (var i = 0, ii = p.controls.length; i < ii; ++i) {
        if (p.controls[i].usesOverlay && !p.controls[i].hidden) {
          return false;
        }
      }
      overlay.style.display = "block";
    }

    for (var i = 0; i < controlData.elements.length; ++i) {
      controlData.elements[i].style.display = "block";
    }

    if (controlData.controlType == "popover") {
      var onControl = function (evt) {
        var obj = evt.target;
        do {
          if (obj == controlData.elements[0]) { return true; }
        } while (obj && (obj = obj.parentNode));
        return false;
      }
      overlay.listeners = Monocle.Events.listenForContact(
        overlay,
        {
          start: function (evt) { if (!onControl(evt)) { hideControl(ctrl); } },
          move: function (evt) { if (!onControl(evt)) { evt.preventDefault(); } }
        }
      );
    }
    controlData.hidden = false;
    if (ctrl.properties) {
      ctrl.properties.hidden = false;
    }
    dispatchEvent('monocle:controlshow', { control: ctrl }, false);
    return true;
  }


  function showingControl(ctrl) {
    var controlData = dataForControl(ctrl);
    return controlData.hidden == false;
  }


  function dispatchEvent(evtType, data, cancelable) {
    return Monocle.Events.dispatch(dom.find('box'), evtType, data, cancelable);
  }


  function listen(evtType, fn, useCapture) {
    Monocle.Events.listen(dom.find('box'), evtType, fn, useCapture);
  }


  function deafen(evtType, fn) {
    Monocle.Events.deafen(dom.find('box'), evtType, fn);
  }


  /* PAGE STYLESHEETS */

  // API for adding a new stylesheet to all components. styleRules should be
  // a string of CSS rules. restorePlace defaults to true.
  //
  // Returns a sheet index value that can be used with updatePageStyles
  // and removePageStyles.
  //
  function addPageStyles(styleRules, restorePlace) {
    return changingStylesheet(function () {
      p.pageStylesheets.push(styleRules);
      var sheetIndex = p.pageStylesheets.length - 1;

      for (var i = 0; i < p.flipper.pageCount; ++i) {
        var doc = dom.find('component', i).contentDocument;
        addPageStylesheet(doc, sheetIndex);
      }
      return sheetIndex;
    }, restorePlace);
  }


  // API for updating the styleRules in an existing page stylesheet across
  // all components. Takes a sheet index value obtained via addPageStyles.
  //
  function updatePageStyles(sheetIndex, styleRules, restorePlace) {
    return changingStylesheet(function () {
      p.pageStylesheets[sheetIndex] = styleRules;
      if (typeof styleRules.join == "function") {
        styleRules = styleRules.join("\n");
      }
      for (var i = 0; i < p.flipper.pageCount; ++i) {
        var doc = dom.find('component', i).contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        if (!styleTag) {
          console.warn('No such stylesheet: ' + sheetIndex);
          return;
        }
        if (styleTag.styleSheet) {
          styleTag.styleSheet.cssText = styleRules;
        } else {
          styleTag.replaceChild(
            doc.createTextNode(styleRules),
            styleTag.firstChild
          );
        }
      }
    }, restorePlace);
  }


  // API for removing a page stylesheet from all components. Takes a sheet
  // index value obtained via addPageStyles.
  //
  function removePageStyles(sheetIndex, restorePlace) {
    return changingStylesheet(function () {
      p.pageStylesheets[sheetIndex] = null;
      for (var i = 0; i < p.flipper.pageCount; ++i) {
        var doc = dom.find('component', i).contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        styleTag.parentNode.removeChild(styleTag);
      }
    }, restorePlace);
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
  function changingStylesheet(callback, restorePlace) {
    restorePlace = (restorePlace === false) ? false : true;
    if (restorePlace) {
      dispatchEvent("monocle:stylesheetchanging", {});
    }
    var result = callback();
    if (restorePlace) {
      recalculateDimensions(true);
      Monocle.defer(
        function () { dispatchEvent("monocle:stylesheetchange", {}); }
      );
    } else {
      recalculateDimensions(false);
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


  function visiblePages() {
    return p.flipper.visiblePages ? p.flipper.visiblePages() : [dom.find('page')];
  }


  function forEachPage(callback) {
    for (var i = 0, ii = p.flipper.pageCount; i < ii; ++i) {
      var page = dom.find('page', i);
      callback(page, i);
    }
  }


  API.getBook = getBook;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.skipToChapter = skipToChapter;
  API.resized = resized;
  API.addControl = addControl;
  API.hideControl = hideControl;
  API.showControl = showControl;
  API.showingControl = showingControl;
  API.dispatchEvent = dispatchEvent;
  API.listen = listen;
  API.deafen = deafen;
  API.addPageStyles = addPageStyles;
  API.updatePageStyles = updatePageStyles;
  API.removePageStyles = removePageStyles;
  API.visiblePages = visiblePages;

  initialize();

  return API;
}


Monocle.Reader.RESIZE_DELAY = 100;
Monocle.Reader.DEFAULT_SYSTEM_ID = 'RS:monocle'
Monocle.Reader.DEFAULT_CLASS_PREFIX = 'monelem_'
Monocle.Reader.DEFAULT_STYLE_RULES = [
  "html#RS\\:monocle * {" +
    "-webkit-font-smoothing: subpixel-antialiased;" +
    "text-rendering: auto !important;" +
    "word-wrap: break-word !important;" +
    "overflow: visible !important;" +
  "}",
  "html#RS\\:monocle body {" +
    "margin: 0 !important;"+
    "border: none !important;" +
    "padding: 0 !important;" +
    "width: 100% !important;" +
    "position: absolute !important;" +
    "-webkit-text-size-adjust: none;" +
  "}",
  "html#RS\\:monocle body * {" +
    "max-width: 100% !important;" +
  "}",
  "html#RS\\:monocle img, html#RS\\:monocle video, html#RS\\:monocle object {" +
    "max-height: 95% !important;" +
    "height: auto !important;" +
  "}"
]

Monocle.pieceLoaded('core/reader');
