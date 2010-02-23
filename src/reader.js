/* READER */

Carlyle.Reader = function (node, bookData) {
  if (Carlyle == this) { return new Carlyle.Reader(node, bookData); }

  // Constants.
  var k = {
    FORWARDS: 1,
    BACKWARDS: -1,
    durations: {
      SLIDE: 240,
      FOLLOW_CURSOR: 100,
      RESIZE_DELAY: 500,
      ANTI_FLICKER_DELAY: 20
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
    //      -> overlay controls
    //      -> modal controls?
    //
    divs: {
      box: null,
      container: null,
      pages: [],
      runners: []
    },

    // The current width of the page.
    pageWidth: 0,

    // The active book.
    book: null,

    // Properties relating to the current page turn interaction.
    turnData: {},

    // A resettable timer which must expire before dimensions are recalculated
    // after the reader has been resized.
    //
    resizeTimer: null,

    // The animation showing that Carlyle is processing something.
    spinner: null,

    // Controls registered to this reader instance.
    controls: [],

    activeIndex: 1
  }

  var profiling = {
    completingTurns: []
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

    p.divs.container = document.createElement('div');
    p.divs.box.appendChild(p.divs.container);

    for (var i = 0; i < 2; ++i) {
      var page = p.divs.pages[i] = document.createElement('div');
      page.pageIndex = i;
      p.divs.container.appendChild(page);

      page.scrollerDiv = document.createElement('div');
      page.appendChild(page.scrollerDiv);

      page.contentDiv = document.createElement('div');
      page.scrollerDiv.appendChild(page.contentDiv);
    }

    applyStyles();

    setBook(bk);

    listenForInteraction();
  }


  function applyStyles() {
    p.divs.container.style.cssText = Carlyle.Styles.ruleText('container');
    for (var i = 0; i < 2; ++i) {
      var page = p.divs.pages[i];
      page.style.cssText = Carlyle.Styles.ruleText('page');
      page.scrollerDiv.style.cssText = Carlyle.Styles.ruleText('scroller');
      page.contentDiv.style.cssText = Carlyle.Styles.ruleText('content');
    }
  }


  function reapplyStyles() {
    applyStyles();
    calcDimensions();
  }


  function setBook(bk) {
    p.book = bk;
    spin();
    calcDimensions();
    spun();
    dispatchEvent("carlyle:bookchange");
    return p.book;
  }


  function getBook() {
    return p.book;
  }


  function resized() {
    spin();
    p.divs.container.style.display = "none";
    clearTimeout(p.resizeTimer);
    p.resizeTimer = setTimeout(
      function () {
        console.log('Recalculating dimensions after resize.')
        p.divs.container.style.display = "block";
        calcDimensions();
        spun();
      },
      k.durations.RESIZE_DELAY
    );
  }


  function calcDimensions() {
    p.divs.box.cumulativeLeft = 0;
    var o = p.divs.box;
    do {
      p.divs.box.cumulativeLeft += o.offsetLeft;
    } while (o = o.offsetParent);

    p.pageWidth = upperPage().offsetWidth;
    var colWidth = upperPage().scrollerDiv.offsetWidth;
    for (var i = 0; i < p.divs.pages.length; ++i) {
      var cDiv = p.divs.pages[i].contentDiv;
      cDiv.style.webkitColumnWidth = cDiv.style.MozColumnWidth = colWidth+"px";
    }

    moveToPage(pageNumber());
  }


  function pageNumber(options) {
    options = options || { div: p.activeIndex };
    var place = p.book.placeFor(p.divs.pages[options.div].contentDiv);
    return place ? (place.pageNumber() || 1) : 1;
  }


  // Returns the current "place" in the book -- ie, the page number, chapter
  // title, etc.
  //
  function getPlace(options) {
    options = options || { div: p.activeIndex };
    return p.book.placeFor(p.divs.pages[options.div].contentDiv);
  }


  // Flips to the given page within the current component. If pageN is
  // greater than the number of pages in this component, overflows into
  // subsequent components.
  //
  // The componentId is optional, defaults to the current component for page-0.
  //
  function moveToPage(pageN, componentId) {
    if (!componentId) {
      var place = getPlace();
      if (place) {
        componentId = place.componentId();
      } else {
        componentId = null;
      }
    }
    pageN = setPage(upperPage(), pageN, componentId);
    completedTurn();
  }


  // Flips to the page approximately 'percent' of the way
  // through the component. Percent, contrary to expectations perhaps,
  // should be a float, where 0.0 is the first page and 1.0 is the last page
  // of the component.
  //
  // The componentId is optional, defaults to the current component for page-0.
  //
  function moveToPercentageThrough(percent, componentId) {
    if (percent == 0) {
      return moveToPage(1);
    }

    // Move to the component.
    setPage(upperPage(), 1, componentId || getPlace().componentId());

    // Calculate the page based on this component.
    var pageN = getPlace().pageAtPercentageThrough(percent);
    if (pageN != 1) {
      setPage(upperPage(), pageN);
    }
    completedTurn();
  }


  // Moves to the relevant element in the relevant component.
  //
  function skipToChapter(src) {
    console.log("Skipping to chapter: " + src);
    var place = p.book.placeOfChapter(upperPage().contentDiv, src);
    moveToPage(place.pageNumber(), place.componentId());
  }


  // Private method that tells the book to update the given pageElement to
  // the given page.
  function setPage(pageElement, pageN, componentId, callback) {
    var rslt = p.book.changePage(pageElement.contentDiv, pageN, componentId);
    if (!rslt) { return false; } // Book may disallow movement to this page.

    // Move the contentDiv so that the current active page is visible.
    // The slight duration prevents 3d-renderer tearing artefacts.
    //setX(pageElement.contentDiv, 0 - rslt.offset, { duration: 1 }, callback);
    pageElement.scrollerDiv.scrollLeft = rslt.offset;

    // Touch the translateX value of the parent div, so that Webkit picks
    // up the change (otherwise there is tearing on OSX 10.6).
    setX(pageElement.scrollerDiv, 0, { duration: 2 }, callback);

    dispatchEvent("carlyle:pagechange");
    return rslt.page;
  }


  // Takes an x point for the entire page, and finds the x point relative
  // to the left of the box div.
  //
  function rebaseX(x) {
    return Math.max(
      Math.min(p.divs.box.offsetWidth, x - p.divs.box.cumulativeLeft),
      0
    );
  }


  // Returns to if the box-based x point is in the "Go forward" zone for
  // user turning a page.
  //
  function inForwardZone(x) {
    return x > p.pageWidth * 0.6;
  }


  // Returns to if the box-based x point is in the "Go backward" zone for
  // user turning a page.
  //
  function inBackwardZone(x) {
    return x < p.pageWidth * 0.4;
  }


  function upperPage() {
    return p.divs.pages[p.activeIndex];
  }


  function lowerPage() {
    return p.divs.pages[(p.activeIndex + 1) % 2];
  }


  function flipPages() {
    upperPage().style.zIndex = 1;
    lowerPage().style.zIndex = 2;
    return p.activeIndex = (p.activeIndex + 1) % 2;
  }


  function deferredCall(fn) {
    setTimeout(fn, k.durations.ANTI_FLICKER_DELAY);
  }


  function liftAnimationFinished(boxPointX) {
    p.turnData.animating = false;
    if (p.turnData.dropped) {
      drop(boxPointX);
      p.turnData.dropped -= 1;
    }
  }


  function lift(boxPointX) {
    if (p.turnData.animating || p.turnData.direction) {
      return;
    }

    p.turnData.points = {
      start: boxPointX,
      min: boxPointX,
      max: boxPointX
    }

    if (inForwardZone(boxPointX)) {
      // At the end of the book, both page numbers are the same. So this is
      // a way to test that we can advance one page.
      if (dispatchEvent('carlyle:lift:forward')) {
        if (pageNumber({div: 0}) != pageNumber({div: 1})) {
          p.turnData.direction = k.FORWARDS;
          slideToCursor(boxPointX);
          liftAnimationFinished();
        }
      }
    } else if (inBackwardZone(boxPointX)) {
      if (dispatchEvent('carlyle:lift:backward')) {
        p.turnData.animating = true;
        var place = getPlace();
        var pageSetSuccessfully = setPage(
          lowerPage(),
          place.pageNumber() - 1,
          place.componentId(),
          function () {
            p.turnData.direction = k.BACKWARDS;
            deferredCall(function() {
              jumpOut(function () {
                deferredCall(function () {
                  flipPages();
                  slideToCursor(boxPointX);
                  liftAnimationFinished(boxPointX);
                });
              });
            });
          }
        );

        if (!pageSetSuccessfully) {
          p.turnData = {};
        }
      }
    } else {
      dispatchEvent('carlyle:lift:center');
    }
  }


  function turning(boxPointX) {
    if (p.turnData.animating || !p.turnData.direction) {
      return;
    }

    p.turnData.points.min = Math.min(p.turnData.points.min, boxPointX);
    p.turnData.points.max = Math.max(p.turnData.points.max, boxPointX);

    // For speed reasons, we constrain motions to a constant number per second.
    var stamp = (new Date()).getTime();
    var followInterval = k.durations.FOLLOW_CURSOR * 1;
    if (
      p.turnData.stamp &&
      stamp - p.turnData.stamp < followInterval
    ) {
      return;
    }
    p.turnData.stamp = stamp;

    slideToCursor(boxPointX);
  }


  function drop(boxPointX) {
    if (p.turnData.animating) {
      p.turnData.dropped = true;
      return;
    }
    if (!p.turnData.direction) {
      return;
    }

    p.turnData.points.tap = p.turnData.points.max - p.turnData.points.min < 10;

    p.turnData.animating = true;

    if (p.turnData.direction == k.FORWARDS) {
      if (p.turnData.points.tap || p.turnData.points.start - boxPointX > 60) {
        // Completing forward turn
        slideOut(flipPages);
      } else {
        // Cancelling forward turn
        slideIn();
      }
    } else if (p.turnData.direction == k.BACKWARDS) {
      if (p.turnData.points.tap || boxPointX - p.turnData.points.start > 60) {
        // Completing backward turn
        slideIn();
      } else {
        // Cancelling backward turn
        slideOut(flipPages);
      }
    }
  }


  function completedTurn() {
    //var tStart = (new Date()).getTime();

    var place = getPlace();
    var resetTurn = function () {
      dispatchEvent("carlyle:turn");
      p.turnData = {};

      // Profiling guff
      /*
      var tTime = parseInt((new Date()).getTime()) - parseInt(tStart);
      profiling.completingTurns.push(tTime);
      var tTot = 0;
      for (var i = 0; i < profiling.completingTurns.length; ++i) {
        tTot += profiling.completingTurns[i];
      }
      console.log(
        "Completing turn took: " + tTime + ". Average: " +
        (tTot / profiling.completingTurns.length)
      );
      */
    }

    if (
      !setPage(
        lowerPage(),
        place.pageNumber() + 1,
        place.componentId(),
        function () {
          jumpIn(resetTurn);
        }
      )
    ) {
      setPage(
        lowerPage(),
        place.pageNumber(),
        place.componentId(),
        function () {
          jumpIn(resetTurn);
        }
      );
    }
  }


  function setX(elem, x, options, callback) {
    var transition;
    var duration;

    if (typeof(x) == "number") { x = x + "px"; }

    if (!options.duration) {
      duration = 0;
      transition = 'none';
    } else {
      duration = parseInt(options['duration']);
      transition = '-webkit-transform';
      transition += ' ' + duration + "ms";
      transition += ' ' + (options['timing'] || 'linear');
      transition += ' ' + (options['delay'] || 0) + 'ms';
    }

    if (typeof WebKitTransitionEvent != "undefined") {
      elem.style.webkitTransition = transition;
      elem.style.webkitTransform = "translateX("+x+")";
    } else if (transition != "none") {
      // Exit any existing transition loop.
      clearTimeout(elem.setXTransitionInterval)

      // FIXME: this is rather naive. We need to ensure that the duration is
      // constant, probably by multiplying step against the ACTUAL interval,
      // rather than the scheduled one (because on slower machines, the
      // interval may be much longer).
      var stamp = (new Date()).getTime();
      var frameRate = 40;
      var finalX = parseInt(x);
      var currX = getX(elem);
      var step = (finalX - currX) * (frameRate / duration);
      var stepFn = function () {
        var destX = currX + step;
        if (
          (new Date()).getTime() - stamp > duration ||
          Math.abs(currX - finalX) <= Math.abs((currX + step) - finalX)
        ) {
          clearTimeout(elem.setXTransitionInterval)
          elem.style.MozTransform = "translateX(" + finalX + "px)";
          if (elem.setXTCB) {
            elem.setXTCB();
          }
        } else {
          elem.style.MozTransform = "translateX(" + destX + "px)";
          currX = destX;
        }
      }

      elem.setXTransitionInterval = setInterval(stepFn, frameRate);
    } else {
      elem.style.MozTransform = "translateX("+x+")";
    }

    if (elem.setXTCB) {
      elem.removeEventListener('webkitTransitionEnd', elem.setXTCB, false);
      elem.setXTCB = null;
    }
    if (callback) {
      if (transition == "none" || getX(elem) == parseInt(x)) {
        callback();
      } else {
        elem.setXTCB = callback;
        elem.addEventListener('webkitTransitionEnd', elem.setXTCB, false);
      }
    }
  }


  function getX(elem) {
    if (typeof WebKitCSSMatrix == "object") {
      var matrix = window.getComputedStyle(elem).webkitTransform;
      matrix = new WebKitCSSMatrix(matrix);
      return matrix.m41;
    } else {
      var prop = elem.style.MozTransform;
      if (!prop || prop == "") { return 0; }
      return parseFloat((/translateX\((\-?.*)px\)/).exec(prop)[1]) || 0;
    }
  }


  /* NB: Jumps are always done by the hidden lower page. */

  function jumpIn(callback) {
    // Duration should be 0, but is set to 1 to address a 10.6 Safari bug.
    setX(lowerPage(), 0, { duration: 1 }, callback);
  }


  function jumpOut(callback) {
    setX(
      lowerPage(),
      0 - p.pageWidth,
      { duration: 0 },
      callback
    );
  }


  function jumpToCursor(cursorX, callback) {
    setX(
      lowerPage(),
      Math.min(0, cursorX - p.pageWidth),
      { duration: 0 },
      callback
    );
  }


  /* NB: Slides are always done by the visible upper page. */

  function slideIn(callback) {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    var cb = completedTurn;
    if (callback && callback != completedTurn) {
      cb = function () { callback(); completedTurn(); }
    }
    setX(upperPage(), 0, slideOpts, cb);
  }


  function slideOut(callback) {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    var cb = completedTurn;
    if (callback && callback != completedTurn) {
      cb = function () { callback(); completedTurn(); }
    }
    setX(upperPage(), 0 - p.pageWidth, slideOpts, cb);
  }


  function slideToCursor(cursorX, callback) {
    setX(
      upperPage(),
      Math.min(0, cursorX - p.pageWidth),
      { duration: k.durations.FOLLOW_CURSOR },
      callback
    );
  }


  function spin() {
    if (Carlyle.Spinner && !p.spinner) {
      p.spinner = new Carlyle.Spinner(p.divs.box);
    }
  }


  function spun() {
    if (p.spinner) {
      p.spinner.stop();
      p.spinner = null;
    }
  }


  function listenForInteraction() {
    var receivesTouchEvents = (typeof Touch == "object");
    if (!receivesTouchEvents) {
      p.divs.container.addEventListener(
        'mousedown',
        function (evt) {
          evt.preventDefault();
          lift(rebaseX(evt.pageX));
          p.divs.container.onmousemove = function (mmevt) {
            mmevt.preventDefault();
            turning(rebaseX(mmevt.pageX));
          }
        },
        false
      );
      p.divs.container.addEventListener(
        'mouseup',
        function (evt) {
          evt.preventDefault();
          p.divs.container.onmousemove = null;
          drop(rebaseX(evt.pageX));
        },
        false
      );
      p.divs.container.addEventListener(
        'mouseout',
        function (evt) {
          obj = evt.relatedTarget;
          while (obj && (obj = obj.parentNode)) {
            if (obj == p.divs.container) { return; }
          }
          evt.preventDefault();
          drop(rebaseX(evt.pageX));
        },
        false
      );
    } else {
      p.divs.container.addEventListener(
        'touchstart',
        function (evt) {
          evt.preventDefault();
          if (evt.targetTouches.length > 1) { return; }
          lift(rebaseX(evt.targetTouches[0].pageX));
        },
        false
      );
      p.divs.container.addEventListener(
        'touchmove',
        function (evt) {
          evt.preventDefault();
          if (evt.targetTouches.length > 1) { return; }
          var rawX = evt.targetTouches[0].pageX - p.divs.box.cumulativeLeft;
          var rbX = rebaseX(evt.targetTouches[0].pageX);
          if (rawX < 0 || rawX > p.divs.box.offsetWidth) {
            drop(rbX);
          } else {
            turning(rbX);
          }
        },
        false
      );
      p.divs.container.addEventListener(
        'touchend',
        function (evt) {
          evt.preventDefault();
          drop(rebaseX(evt.changedTouches[0].pageX));
        },
        false
      );
      p.divs.container.addEventListener(
        'touchcancel',
        function (evt) {
          evt.preventDefault();
          drop(rebaseX(evt.changedTouches[0].pageX));
        },
        false
      );
      window.addEventListener('orientationchange', resized, true);
    }
  }


  function registerPageControl(control) {
    for (var i = 0; i < p.divs.pages.length; ++i) {
      var page = p.divs.pages[i];
      var runner = control.createControlElements();
      page.appendChild(runner);
      p.divs.runners.push(runner);
    }
  }


  function dispatchEvent(evtType) {
    var turnEvt = document.createEvent("Events");
    turnEvt.initEvent(evtType, false, true);
    return p.divs.box.dispatchEvent(turnEvt);
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
  API.spin = spin;
  API.spun = spun;
  API.registerPageControl = registerPageControl;
  API.addEventListener = addEventListener;

  initialize(node, bookData);

  return API;
}
