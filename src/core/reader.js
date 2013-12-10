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
//  fontScale: a float to multiply against the default font-size of each
//    element in each component.
//
//  place: A book locus for the page to open to when the reader is
//    initialized. (See comments at Book#pageNumberAt for more about
//    the locus option).
//
//  systemId: the id for root elements of components, defaults to "RS:monocle"
//
Monocle.Reader = function (node, bookData, options, onLoadCallback) {

  var API = { constructor: Monocle.Reader }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    // Initialization-completed flag.
    initialized: false,

    // The active book.
    book: null,

    // DOM graph of factory-generated objects.
    graph: {},

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

    API.billboard = new Monocle.Billboard(API);

    if (!Monocle.Browser.env.isCompatible()) {
      if (dispatchEvent("monocle:incompatible", {}, true)) {
        fatalSystemMessage(k.COMPATIBILITY_INFO);
      }
      return;
    }

    dispatchEvent("monocle:initializing", API);

    bookData = bookData || Monocle.bookDataFromNodes([box.cloneNode(true)]);
    var bk = new Monocle.Book(bookData, options.preloadWindow || 1);

    box.innerHTML = "";

    // Make sure the box div is absolutely or relatively positioned.
    positionBox();

    // Attach the page-flipping gadget.
    attachFlipper(options.flipper);

    // Create the essential DOM elements.
    createReaderElements();

    // Create the selection object.
    API.selection = new Monocle.Selection(API);

    // Create the formatting object.
    API.formatting = new Monocle.Formatting(
      API,
      options.stylesheet,
      options.fontScale
    );

    listen('monocle:turn', onPageTurn);

    primeFrames(options.primeURL, function () {
      // Make the reader elements look pretty.
      applyStyles();

      p.flipper.listenForInteraction(options.panels);

      setBook(bk, options.place, function () {
        if (onLoadCallback) { onLoadCallback(API); }
        dispatchEvent("monocle:loaded", API);
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
      if (Monocle.Browser.renders.slow) {
        flipperClass = Monocle.Flippers.Instant;
      } else {
        flipperClass = Monocle.Flippers.Slider;
      }
    }

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
    }
    dom.append('div', 'overlay');
    dispatchEvent("monocle:loading", API);
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
    if (Monocle.Browser.env.relativeIframeExpands) {
      for (var i = 0, cmpt; cmpt = dom.find('component', i); ++i) {
        cmpt.style.display = 'none';
      }
    }
  }


  function lockFrameWidths() {
    for (var i = 0, cmpt; cmpt = dom.find('component', i); ++i) {
      cmpt.style.width = cmpt.parentNode.offsetWidth+'px';
      if (Monocle.Browser.env.relativeIframeExpands) {
        cmpt.style.display = 'block';
      }
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
        'monocle:componentfailed': function (evt) {
          fatalSystemMessage(k.LOAD_FAILURE_INFO);
          return true;
        },
        'monocle:turn': function (evt) {
          deafen('monocle:componentfailed', listener);
          callback();
          return true;
        }
      }
      var listener = function (evt) {
        if (watchers[evt.type](evt)) { deafen(evt.type, listener); }
      }
      for (var evtType in watchers) { listen(evtType, listener) }
    }
    p.flipper.moveTo(place || { page: 1 }, initialized);
  }


  function getBook() {
    return p.book;
  }


  function initialized() {
    p.initialized = true;
  }


  // Attempts to restore the place we were up to in the book before the
  // reader was resized.
  //
  // The delay ensures that if we get multiple calls to this function in
  // a short period, we don't do lots of expensive recalculations.
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
    p.resizeTimer = Monocle.defer(performResize, k.RESIZE_DELAY);
  }


  function performResize() {
    lockFrameWidths();
    recalculateDimensions(true, afterResized);
  }


  function afterResized() {
    dispatchEvent('monocle:resize');
  }


  function recalculateDimensions(andRestorePlace, callback) {
    if (!p.book) { return; }
    if (p.onRecalculate) {
      var oldFn = p.onRecalculate;
      p.onRecalculate = function () {
        oldFn();
        if (typeof callback == 'function') { callback(); }
      }
      return;
    }

    dispatchEvent("monocle:recalculating");
    p.onRecalculate = function () {
      if (typeof callback == 'function') { callback(); }
      p.onRecalculate = null;
      dispatchEvent("monocle:recalculated");
    }

    var onComplete = function () { Monocle.defer(p.onRecalculate); }
    var onInitiate = onComplete;
    if (andRestorePlace !== false && p.lastLocus) {
      onInitiate = function () {
        p.flipper.moveTo(p.lastLocus, onComplete, false);
      }
    }

    forEachPage(function (pageDiv) {
      pageDiv.m.activeFrame.m.component.updateDimensions(pageDiv);
    });

    Monocle.defer(onInitiate);
  }


  function onPageTurn(evt) {
    if (p.onRecalculate) {
    } else {
      var place = getPlace();
      p.lastLocus = {
        componentId: place.componentId(),
        percent: place.percentageThrough()
      }
      dispatchEvent('monocle:position', { place: place });
    }
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
      dispatchEvent('monocle:turning');
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
  //  - container -- specify an existing DOM element to contain the control.
  //
  function addControl(ctrl, cType, options) {
    for (var i = 0; i < p.controls.length; ++i) {
      if (p.controls[i].control == ctrl) {
        console.warn("Already added control: %o", ctrl);
        return;
      }
    }

    options = options || {};

    var ctrlData = { control: ctrl, elements: [], controlType: cType }
    p.controls.push(ctrlData);

    var addControlTo = function (cntr) {
      if (cntr == 'container') {
        cntr = options.container || dom.find('container');
        if (typeof cntr == 'string') { cntr = document.getElementById(cntr); }
        if (!cntr.dom) { dom.claim(cntr, 'controlContainer'); }
      } else if (cntr == 'overlay') {
        cntr = dom.find('overlay');
      }
      if (typeof ctrl.createControlElements != 'function') { return; }
      var ctrlElem = ctrl.createControlElements(cntr);
      if (!ctrlElem) { return; }
      cntr.appendChild(ctrlElem);
      ctrlData.elements.push(ctrlElem);
      Monocle.Styles.applyRules(ctrlElem, Monocle.Styles.control);
      return ctrlElem;
    }

    if (!cType || cType == 'standard' || cType == 'invisible') {
      addControlTo('container');
    } else if (cType == 'page') {
      forEachPage(addControlTo);
    } else if (cType == 'modal' || cType == 'popover' || cType == 'hud') {
      addControlTo('overlay');
      ctrlData.usesOverlay = true;
    } else if (cType == 'invisible') {
      addControlTo('container');
    } else {
      console.warn('Unknown control type: ' + cType);
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
      if (controlData.controlType != 'hud') {
        dispatchEvent('monocle:modal:off');
      }
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
    var i, ii;
    if (controlData.usesOverlay && controlData.controlType != "hud") {
      for (i = 0, ii = p.controls.length; i < ii; ++i) {
        if (p.controls[i].usesOverlay && !p.controls[i].hidden) {
          return false;
        }
      }
      overlay.style.display = "block";
      dispatchEvent('monocle:modal:on');
    }

    for (i = 0; i < controlData.elements.length; ++i) {
      controlData.elements[i].style.display = "block";
    }

    if (controlData.controlType == "popover") {
      var beyondControl = function (evt) {
        var obj = evt.target;
        do {
          if (obj == controlData.elements[0]) { return false; }
        } while (obj && (obj = obj.parentNode));
        Gala.stop(evt);
        return true;
      }
      var handlers = {
        start: function (e) { if (beyondControl(e)) { hideControl(ctrl); } },
        move: beyondControl
      }
      overlay.listeners = Monocle.Events.listenForContact(overlay, handlers);
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
    return controlData.hidden === false;
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


  function visiblePages() {
    return p.flipper.visiblePages ?
      p.flipper.visiblePages() :
      [dom.find('page')];
  }


  function forEachPage(callback) {
    for (var i = 0, ii = p.flipper.pageCount; i < ii; ++i) {
      var page = dom.find('page', i);
      callback(page, i);
    }
  }


  /* The Reader PageStyles API is deprecated - it has moved to Formatting */

  function addPageStyles(styleRules, restorePlace) {
    console.deprecation("Use reader.formatting.addPageStyles instead.");
    return API.formatting.addPageStyles(styleRules, restorePlace);
  }


  function updatePageStyles(sheetIndex, styleRules, restorePlace) {
    console.deprecation("Use reader.formatting.updatePageStyles instead.");
    return API.formatting.updatePageStyles(sheetIndex, styleRules, restorePlace);
  }


  function removePageStyles(sheetIndex, restorePlace) {
    console.deprecation("Use reader.formatting.removePageStyles instead.");
    return API.formatting.removePageStyles(sheetIndex, restorePlace);
  }


  function fatalSystemMessage(msg) {
    var info = dom.make('div', 'book_fatality', { html: msg });
    var box = dom.find('box');
    var bbOrigin = [box.offsetWidth / 2, box.offsetHeight / 2];
    API.billboard.show(info, { closeButton: false, from: bbOrigin });
  }


  API.getBook = getBook;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.skipToChapter = skipToChapter;
  API.resized = resized;
  API.recalculateDimensions = recalculateDimensions;
  API.addControl = addControl;
  API.hideControl = hideControl;
  API.showControl = showControl;
  API.showingControl = showingControl;
  API.dispatchEvent = dispatchEvent;
  API.listen = listen;
  API.deafen = deafen;
  API.visiblePages = visiblePages;

  // Deprecated!
  API.addPageStyles = addPageStyles;
  API.updatePageStyles = updatePageStyles;
  API.removePageStyles = removePageStyles;

  initialize();

  return API;
}


Monocle.Reader.RESIZE_DELAY = Monocle.Browser.renders.slow ? 500 : 100;
Monocle.Reader.DEFAULT_SYSTEM_ID = 'RS:monocle'
Monocle.Reader.DEFAULT_CLASS_PREFIX = 'monelem_'
Monocle.Reader.DEFAULT_STYLE_RULES = Monocle.Formatting.DEFAULT_STYLE_RULES;
Monocle.Reader.COMPATIBILITY_INFO =
  "<h1>Incompatible browser</h1>"+
  "<p>Unfortunately, your browser isn't able to display this book. "+
  "If possible, try again in another browser or on another device.</p>";
Monocle.Reader.LOAD_FAILURE_INFO =
  "<h1>Book could not be loaded</h1>"+
  "<p>Sorry, parts of the book could not be retrieved.<br />"+
  "Please check your connection and refresh to try again.</p>";
