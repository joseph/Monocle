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
      RESIZE_DELAY: 100,
      ANTI_FLICKER_DELAY: 10
    },
    opacities: {
      VISIBLE: 1,
      HIDDEN: 0.01
    },
    OFF_SCREEN_GAP: 10
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
    p.divs.box = typeof(node) == "string" ? document.getElementById(node) : node;

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
      p.divs.pages[i] = document.createElement('div');
      p.divs.pages[i].pageIndex = i;
      p.divs.container.appendChild(p.divs.pages[i]);

      p.divs.pages[i].scrollerDiv = document.createElement('div');
      p.divs.pages[i].appendChild(p.divs.pages[i].scrollerDiv);

      p.divs.pages[i].contentDiv = document.createElement('div');
      p.divs.pages[i].scrollerDiv.appendChild(p.divs.pages[i].contentDiv);
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
    p.divs.pages[1].style.cssText += Carlyle.Styles.ruleText('overPage');
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
    do { p.divs.box.cumulativeLeft += o.offsetLeft; } while (o = o.offsetParent);

    p.pageWidth = p.divs.pages[0].offsetWidth;
    var colWidth = p.divs.pages[0].scrollerDiv.offsetWidth;
    for (var i = 0; i < p.divs.pages.length; ++i) {
      p.divs.pages[i].contentDiv.style.webkitColumnWidth = colWidth + "px";
    }

    moveToPage(pageNumber());
  }


  function pageNumber(options) {
    options = options || { div: 0 };
    var place = p.book.placeFor(p.divs.pages[options.div].contentDiv);
    return place ? (place.pageNumber() || 1) : 1;
  }


  // Returns the current "place" in the book -- ie, the page number, chapter
  // title, etc.
  //
  function getPlace(options) {
    options = options || { div: 0 };
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
    pageN = setPage(p.divs.pages[0], pageN, componentId);
    setPage(p.divs.pages[1], pageN, getPlace().componentId());
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
    setPage(p.divs.pages[0], 1, componentId || getPlace().componentId());

    // Calculate the page based on this component.
    var pageN = getPlace().pageAtPercentageThrough(percent);
    moveToPage(pageN);
    completedTurn();
  }


  // Moves to the relevant element in the relevant component.
  //
  function skipToChapter(src) {
    console.log("Skipping to chapter: " + src);
    var place = p.book.placeOfChapter(p.divs.pages[0].contentDiv, src);
    moveToPage(place.pageNumber(), place.componentId());
    completedTurn();
  }


  // Private method that tells the book to update the given pageElement to
  // the given page.
  function setPage(pageElement, pageN, componentId) {
    pageN = p.book.changePage(pageElement.contentDiv, pageN, componentId);
    if (!pageN) { return false; } // Book may disallow movement to this page.
    dispatchEvent("carlyle:pagechange");
    return pageN;
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
    return x > p.pageWidth * 0.5;
  }


  // Returns to if the box-based x point is in the "Go backward" zone for
  // user turning a page.
  //
  function inBackwardZone(x) {
    return x < p.pageWidth * 0.5;
  }


  function lift(boxPointX) {
    if (p.turnData.direction || p.turnData.animating) {
      return;
    }

    p.turnData.animating = true;

    if (inForwardZone(boxPointX)) {
      // Show the overpage, then wait for that to take effect, then
      // scroll the underpage to the next page, then wait for that to take
      // effect.
      showOverPage();
      setTimeout(
        function () {
          if (setPage(p.divs.pages[0], pageNumber() + 1)) {
            p.turnData.direction = k.FORWARDS;
          } else {
            hideOverPage();
          }
          setTimeout(
            function () { p.turnData.animating = false; },
            k.durations.ANTI_FLICKER_DELAY
          );
        },
        k.durations.ANTI_FLICKER_DELAY
      );
    } else if (inBackwardZone(boxPointX)) {
      // Scroll the overpage, wait for that to take effect, move the overPage
      // off the screen, wait for that to take effect, show the over page,
      // wait for that to take effect.
      //
      // Unfortunately this still doesn't work. There is an occasional flicker
      // on showOverPage(), no matter how long we wait beforehand.

      //moveToPage(pageNumber() - 1);
      //return;

      if (setPage(p.divs.pages[1], pageNumber() - 1)) {
        p.turnData.direction = k.BACKWARDS;
        setTimeout(
          function () {
            jumpOut();
            setTimeout(
              function () {
                showOverPage();
                setTimeout(
                  function () { p.turnData.animating = false; },
                  k.durations.ANTI_FLICKER_DELAY
                );
              },
              k.durations.ANTI_FLICKER_DELAY
            );
          },
          k.durations.ANTI_FLICKER_DELAY
        );
      }
    }
  }


  function turning(boxPointX) {
    if (!p.turnData.direction || p.turnData.animating) {
      return;
    }

    if (
      p.turnData.direction == k.FORWARDS &&
      !inForwardZone(boxPointX)
    ) {
      p.turnData.cancellable = true;
    } else if (
      p.turnData.direction == k.BACKWARDS &&
      !inBackwardZone(boxPointX)
    ) {
      p.turnData.cancellable = true;
    }

    // For speed reasons, we constrain movements to a constant number per second.
    var stamp = (new Date()).getTime();
    var followInterval = k.durations.FOLLOW_CURSOR * 0.75;
    if (
      p.turnData.stamp &&
      stamp - p.turnData.stamp < followInterval
    ) {
      return;
    }
    p.turnData.stamp = stamp;

    slideToCursor(boxPointX);
  }


  function turn(boxPointX) {
    if (p.turnData.direction == k.FORWARDS) {
      if (p.turnData.cancellable && inForwardZone(boxPointX)) {
        // Cancelling forward turn
        slideIn(boxPointX);
      } else {
        // Completing forward turn
        slideOut(boxPointX);
      }
    } else if (p.turnData.direction == k.BACKWARDS) {
      if (p.turnData.cancellable && inBackwardZone(boxPointX)) {
        // Cancelling backward turn
        slideOut(boxPointX);
      } else {
        // Completing backward turn
        slideIn(boxPointX);
      }
    }
    p.turnData.animating = true;
  }


  function completedTurn() {
    dispatchEvent("carlyle:turn");
    hideOverPage();
    jumpIn();
    p.turnData = {};
  }


  function setX(elem, x, options, callback) {
    var transition;
    var duration;

    if (!options['duration']) {
      duration = 0;
      transition = 'none';
    } else {
      duration = parseInt(options['duration']);
      transition = '-webkit-transform';
      transition += ' ' + duration + "ms";
      transition += ' ' + (options['timing'] || 'linear');
      transition += ' ' + (options['delay'] || 0) + 'ms';
    }
    elem.style.webkitTransition = transition;

    if (typeof(x) == "number") { x = x + "px"; }
    elem.style.webkitTransform = 'translateX('+x+')';

    if (elem.setXTransitionCallback) {
      elem.removeEventListener(
        'webkitTransitionEnd',
        elem.setXTransitionCallback,
        false
      );
      elem.setXTransitionCallback = null;
    }
    if (callback) {
      if (transition == 'none') {
        callback();
      } else {
        elem.setXTransitionCallback = callback;
        elem.addEventListener(
          'webkitTransitionEnd',
          elem.setXTransitionCallback,
          false
        );
      }
    }
  }


  function jumpIn() {
    setX(p.divs.pages[1], 0, { duration: 0 });
  }


  function jumpOut() {
    setX(
      p.divs.pages[1],
      0 - (p.pageWidth + k.OFF_SCREEN_GAP),
      { duration: 0 }
    );
  }


  function jumpToCursor(cursorX) {
    setX(
      p.divs.pages[1],
      Math.min(0, cursorX - p.pageWidth),
      { duration: 0 }
    );
  }

  function slideIn(cursorX) {
    var retreatFn = function () {
      setPage(p.divs.pages[0], pageNumber() - 1);
      setTimeout(completedTurn, k.durations.ANTI_FLICKER_DELAY)
    }
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    setX(p.divs.pages[1], 0, slideOpts, retreatFn);
  }


  function slideOut(cursorX) {
    var advanceFn = function () {
      setPage(p.divs.pages[1], pageNumber({ div: 1 }) + 1);
      setTimeout(completedTurn, k.durations.ANTI_FLICKER_DELAY);
    }
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    setX(
      p.divs.pages[1],
      0 - (p.pageWidth + k.OFF_SCREEN_GAP),
      slideOpts,
      advanceFn
    );
  }


  function slideToCursor(cursorX) {
    setX(
      p.divs.pages[1],
      Math.min(0, cursorX - p.pageWidth),
      { duration: k.durations.FOLLOW_CURSOR }
    );
  }


  function showOverPage() {
    if (p.divs.pages[1].style.opacity != k.opacities.VISIBLE) {
      p.divs.pages[1].style.opacity = k.opacities.VISIBLE;
    }
  }


  function hideOverPage() {
    if (p.divs.pages[1].style.opacity != k.opacities.HIDDEN) {
      p.divs.pages[1].style.opacity = k.opacities.HIDDEN;
    }
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
    // Listeners
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
          if (!p.turnData.direction) { return; }
          turn(rebaseX(evt.pageX));
        },
        false
      );
      p.divs.container.addEventListener(
        'mouseout',
        function (evt) {
          if (!p.turnData.direction) { return; }
          obj = evt.relatedTarget;
          while (obj && (obj = obj.parentNode)) {
            if (obj == p.divs.container) { return; }
          }
          evt.preventDefault();
          turn(rebaseX(evt.pageX));
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
          if (!p.turnData.direction) { return; }
          if (evt.targetTouches.length > 1) { return; }
          var rawX = evt.targetTouches[0].pageX - p.divs.box.cumulativeLeft;
          var rbX = rebaseX(evt.targetTouches[0].pageX);
          if (rawX < 0 || rawX > p.divs.box.offsetWidth) {
            turn(rbX);
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
          if (!p.turnData.direction) { return; }
          turn(rebaseX(evt.changedTouches[0].pageX));
        },
        false
      );
      p.divs.container.addEventListener(
        'touchcancel',
        function (evt) {
          if (!p.turnData.direction) { return; }
          evt.preventDefault();
          turn(rebaseX(evt.changedTouches[0].pageX));
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
    p.divs.box.dispatchEvent(turnEvt);
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
