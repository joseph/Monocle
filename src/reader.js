/* READER */

Carlyle.Reader = function (node, bookData) {
  if (Carlyle == this) { return new Carlyle.Reader(node, bookData); }

  // Constants.
  var k = {
    durations: {
      RESIZE_DELAY: 500
    }
  }

  // Properties.
  var p = {
    // Divs only stores the box, the container and the two pages. But the full
    // hierarchy (at this time) is:
    //
    //   box
    //    -> container
    //      -> pages (2)
    //        -> scroller
    //          -> content
    //        -> page controls
    //      -> overlay
    //        -> modal/popover controls
    //      -> standard controls
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

    // Controls registered to this reader instance.
    controls: []
  }

  // Methods and properties available to external code.
  var API = {
    constructor: Carlyle.Reader,
    properties: p,
    constants: k
  }


  // Sets up the container and internal elements.
  //
  function initialize(node, bookData) {
    p.divs.box = typeof(node) == "string" ?
      document.getElementById(node) :
      node;

    dispatchEvent("carlyle:initializing");

    var bk;
    if (bookData) {
      bk = new Carlyle.Book(bookData);
    } else {
      bk = Carlyle.Book.fromHTML(p.divs.box.innerHTML);
    }
    p.divs.box.innerHTML = "";

    // Make sure the box div is absolutely or relatively positioned.
    var currStyle = document.defaultView.getComputedStyle(p.divs.box, null);
    var currPosVal = currStyle.getPropertyValue('position');
    if (["absolute", "relative"].indexOf(currPosVal) == -1) {
      p.divs.box.style.position = "relative";
    }

    // Create the essential DOM elements.
    p.divs.container = document.createElement('div');
    p.divs.box.appendChild(p.divs.container);

    p.flipper = new Carlyle.Flippers.Instant(API, setPage); // FIXME: detect?

    for (var i = 0; i < p.flipper.pageCount; ++i) {
      var page = p.divs.pages[i] = document.createElement('div');
      page.pageIndex = i;
      p.flipper.addPage(page);
      p.divs.container.appendChild(page);

      page.scrollerDiv = document.createElement('div');
      page.appendChild(page.scrollerDiv);

      page.contentDiv = document.createElement('div');
      page.scrollerDiv.appendChild(page.contentDiv);
    }

    p.divs.overlay = document.createElement('div');
    p.divs.container.appendChild(p.divs.overlay);

    dispatchEvent("carlyle:loading");

    applyStyles();

    setBook(bk);

    listenForInteraction();

    dispatchEvent("carlyle:loaded")
  }


  function applyStyles() {
    p.divs.container.style.cssText = Carlyle.Styles.ruleText('container');
    for (var i = 0; i < p.flipper.pageCount; ++i) {
      var page = p.divs.pages[i];
      page.style.cssText = Carlyle.Styles.ruleText('page');
      page.scrollerDiv.style.cssText = Carlyle.Styles.ruleText('scroller');
      page.contentDiv.style.cssText = Carlyle.Styles.ruleText('content');
    }
    p.divs.overlay.style.cssText = Carlyle.Styles.ruleText('overlay');
  }


  function reapplyStyles() {
    applyStyles();
    calcDimensions();
  }


  function setBook(bk) {
    if (!dispatchEvent("carlyle:bookchanging")) {
      return;
    }
    p.book = bk;
    calcDimensions();
    dispatchEvent("carlyle:bookchange");
    return p.book;
  }


  function getBook() {
    return p.book;
  }


  function resized() {
    if (!dispatchEvent("carlyle:resizing")) {
      return;
    }
    clearTimeout(p.resizeTimer);
    p.resizeTimer = setTimeout(
      function () {
        console.log('Recalculating dimensions after resize.')
        calcDimensions();
        dispatchEvent("carlyle:resize");
      },
      k.durations.RESIZE_DELAY
    );
  }


  function calcDimensions() {
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
      //FIXME: SHOULD BE ACTIVE PAGE?
      p.pageWidth = p.divs.pages[0].offsetWidth;
      var cWidth = p.divs.pages[0].scrollerDiv.offsetWidth;
      for (var i = 0; i < p.divs.pages.length; ++i) {
        var cDiv = p.divs.pages[i].contentDiv;
        cDiv.style.webkitColumnWidth = cDiv.style.MozColumnWidth = cWidth+"px";
      }
    } else {
      p.flipper.overrideDimensions();
    }

    moveToPage(pageNumber());
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


  // Flips to the given page within the current component. If pageN is
  // greater than the number of pages in this component, overflows into
  // subsequent components.
  //
  // The componentId is optional, defaults to the current component.
  //
  function moveToPage(pageN, componentId) {
    if (!componentId) {
      var currPlace = getPlace();
      if (currPlace) {
        componentId = currPlace.componentId();
      } else {
        componentId = null;
      }
    }

    p.flipper.moveTo({ page: pageN }, componentId);
  }


  // Flips to the page approximately 'percent' of the way
  // through the component. Percent, contrary to expectations perhaps,
  // should be a float, where 0.0 is the first page and 1.0 is the last page
  // of the component.
  //
  // The componentId is optional, defaults to the current component.
  //
  function moveToPercentageThrough(percent, componentId) {
    if (!componentId) {
      var currPlace = getPlace();
      if (currPlace) {
        componentId = currPlace.componentId();
      } else {
        componentId = null;
      }
    }

    p.flipper.moveTo({ percent: percent }, componentId);
  }


  // Moves to the relevant element in the relevant component.
  //
  function skipToChapter(src) {
    console.log("Skipping to chapter: " + src);
    //FIXME: SHOULD BE ACTIVE PAGE?
    var place = p.book.placeOfChapter(p.divs.pages[0].contentDiv, src);
    p.flipper.moveTo({ page: place.pageNumber() }, place.componentId());
  }


  // Private method that tells the book to update the given pageElement to
  // the given page.
  //
  // This method is handed over to the flipper, which calls it with a
  // callback to do the actual display change.
  //
  function setPage(pageDiv, locus, componentId, callback) {
    var eData = { page: pageDiv, locus: locus, componentId: componentId }

    // Other things may disallow page change.
    if (!dispatchEvent('carlyle:pagechanging', eData)) {
      return;
    }

    var rslt = p.book.changePage(pageDiv.contentDiv, locus, componentId);

    // The book may disallow changing to the given page.
    if (!rslt) {
      return false;
    }

    if (typeof callback == "function") {
      callback(rslt.offset);
    }

    eData.pageNumber = rslt.page;
    eData.componentId = rslt.componentId;
    dispatchEvent("carlyle:pagechange", eData);

    return rslt.page;
  }


  function listenForInteraction() {
    var receivesTouchEvents = (typeof Touch == "object");

    if (!receivesTouchEvents) {
      p.divs.container.addEventListener(
        'mousedown',
        function (evt) {
          if (evt.button != 0) {
            return;
          }
          p.interactionData.mouseDown = true;
          contactEvent(evt, "start", evt);
        },
        false
      );
      p.divs.container.addEventListener(
        'mousemove',
        function (evt) {
          if (!p.interactionData.mouseDown) {
            return false;
          }
          contactEvent(evt, "move", evt);
        },
        false
      );
      p.divs.container.addEventListener(
        'mouseup',
        function (evt) {
          if (!p.interactionData.mouseDown) {
            return false;
          }
          contactEvent(evt, "end", evt);
        },
        false
      );
      p.divs.container.addEventListener(
        'mouseout',
        function (evt) {
          if (!p.interactionData.mouseDown) {
            return false;
          }
          obj = evt.relatedTarget;
          while (obj && (obj = obj.parentNode)) {
            if (obj == p.divs.container) { return; }
          }
          contactEvent(evt, 'end', evt);
        },
        false
      );
    } else {
      p.divs.container.addEventListener(
        'touchstart',
        function (evt) {
          if (evt.targetTouches.length > 1) { return; }
          contactEvent(evt, 'start', evt.targetTouches[0]);
        },
        false
      );
      p.divs.container.addEventListener(
        'touchmove',
        function (evt) {
          if (evt.targetTouches.length > 1) { return; }
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
        },
        false
      );
      p.divs.container.addEventListener(
        'touchend',
        function (evt) {
          contactEvent(evt, "end", evt.changedTouches[0]);
        },
        false
      );
      p.divs.container.addEventListener(
        'touchcancel',
        function (evt) {
          contactEvent(evt, "end", evt.changedTouches[0]);
        },
        false
      );
      window.addEventListener('orientationchange', resized, true);
    }
    p.flipper.listenForInteraction();
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
    if (
      !dispatchEvent("carlyle:contact:"+eType, cData) ||
      !dispatchEvent("carlyle:contact:"+eType+":unhandled", cData)
    ) {
      evt.preventDefault();
    }

    if (eType == "end") {
      p.interactionData = {};
    }
  }


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
    if (p.controls.indexOf(ctrl) != -1) {
      console.log("Already added control: " + ctrl);
      return;
    }

    options = options || {};

    var ctrlData = {
      control: ctrl,
      elements: [],
      controlType: cType
    }
    p.controls.push(ctrlData);

    if (!cType || cType == "standard") {
      var ctrlElem = ctrl.createControlElements();
      p.divs.container.appendChild(ctrlElem);
      ctrlData.elements.push(ctrlElem);
    } else if (cType == "page") {
      for (var i = 0; i < p.divs.pages.length; ++i) {
        var page = p.divs.pages[i];
        var runner = ctrl.createControlElements();
        page.appendChild(runner);
        ctrlData.elements.push(runner);
      }
    } else if (cType == "modal" || cType == "popover") {
      var ctrlElem = ctrl.createControlElements();
      p.divs.overlay.appendChild(ctrlElem);
      p.divs.overlay.cssText += "width: 100%; height: 100%";
      ctrlData.elements.push(ctrlElem);
    } else if (cType == "invisible") {
      // Nothing to do, really.
    } else {
      console.log("Unknown control type: " + cType);
    }

    for (var i = 0; i < ctrlData.elements.length; ++i) {
      ctrlData.elements[i].style.cssText += Carlyle.Styles.ruleText('control');
    }

    if (options.hidden) {
      hideControl(ctrl);
    }

    return ctrl;
  }


  function hideControl(ctrl) {
    for (var i = 0; i < p.controls.length; ++i) {
      if (p.controls[i].control == ctrl) {
        for (var j = 0; j < p.controls[i].elements.length; ++j) {
          p.controls[i].elements[j].style.display = "none";
        }
      }
    }
    if (ctrl.properties) {
      ctrl.properties.hidden = true;
    }
  }


  function showControl(ctrl) {
    for (var i = 0; i < p.controls.length; ++i) {
      if (p.controls[i].control == ctrl) {
        for (var j = 0; j < p.controls[i].elements.length; ++j) {
          p.controls[i].elements[j].style.display = "block";
        }
      }
    }
    if (ctrl.properties) {
      ctrl.properties.hidden = false;
    }
  }


  function dispatchEvent(evtType, data) {
    var evt = document.createEvent("Events");
    // FIXME: should take cancellable value from args?
    evt.initEvent(evtType, false, true);
    evt.carlyleData = data;
    return p.divs.box.dispatchEvent(evt);
  }


  function addEventListener(evtType, fn) {
    p.divs.box.addEventListener(evtType, fn, false);
  }


  API.setBook = setBook;
  API.getBook = getBook;
  API.reapplyStyles = reapplyStyles;
  API.getPlace = getPlace;
  API.moveToPage = moveToPage;
  API.moveToPercentageThrough = moveToPercentageThrough;
  API.skipToChapter = skipToChapter;
  API.resized = resized;
  API.addControl = addControl;
  API.hideControl = hideControl;
  API.showControl = showControl;
  API.addEventListener = addEventListener;

  initialize(node, bookData);

  return API;
}
