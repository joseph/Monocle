/* READER */
Carlyle.Reader = function (node, bookData) {
  if (Carlyle == this) { return new Carlyle.Reader(node, bookData); }

  var FORWARDS = 1, BACKWARDS = -1;

  var boxDiv;
  var containerDiv;
  var pageDivs = [];
  var pageWidth = 0;
  var book;
  var turnData = {};
  var resizeTimer = null;
  //var slideSpeedDivisor = 1.5;
  var slideDuration = 240;
  var followCursorDuration = 100;
  var spinner;

  // Sets up the container and internal elements.
  //
  function initialize(node, bookData) {
    boxDiv = typeof(node) == "string" ? document.getElementById(node) : node;

    var bk;
    if (bookData) {
      bk = new Carlyle.Book(bookData);
    } else {
      bk = Carlyle.Book.fromHTML(boxDiv.innerHTML);
    }
    boxDiv.innerHTML = "";

    // Make sure the boxDiv is absolutely or relatively positioned.
    var currStyle = document.defaultView.getComputedStyle(boxDiv, null);
    var currPosVal = currStyle.getPropertyValue('position');
    if (["absolute", "relative"].indexOf(currPosVal) == -1) {
      boxDiv.style.position = "relative";
    }

    containerDiv = document.createElement('div');
    containerDiv.style.cssText += Carlyle.Styles.ruleText('container');
    boxDiv.appendChild(containerDiv);

    for (var i = 0; i < 2; ++i) {
      pageDivs[i] = document.createElement('div');
      pageDivs[i].pageIndex = i;
      pageDivs[i].style.cssText = Carlyle.Styles.ruleText('page');
      containerDiv.appendChild(pageDivs[i]);

      createRunningHead(pageDivs[i], 'header');
      createRunningHead(pageDivs[i], 'footer');

      pageDivs[i].scrollerDiv = document.createElement('div');
      pageDivs[i].scrollerDiv.style.cssText = Carlyle.Styles.ruleText('scroller');
      pageDivs[i].appendChild(pageDivs[i].scrollerDiv);

      pageDivs[i].contentDiv = document.createElement('div');
      pageDivs[i].contentDiv.style.cssText = Carlyle.Styles.ruleText('content');
      pageDivs[i].scrollerDiv.appendChild(pageDivs[i].contentDiv);
    }
    pageDivs[1].style.cssText += Carlyle.Styles.ruleText('overPage');

    setBook(bk);

    listenForInteraction();
  }


  function setBook(bk) {
    book = bk;
    spin();
    setRunningHead(pageDivs[0].header, { left: bk.getMetaData('title') });
    setRunningHead(pageDivs[1].header, { left: bk.getMetaData('title') });
    calcDimensions();
    spun();
    return book;
  }


  function getBook() {
    return book;
  }


  function resized() {
    spin();
    containerDiv.style.display = "none";
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(
      function () {
        console.log('Recalculating dimensions after resize.')
        containerDiv.style.display = "block";
        calcDimensions();
        spun();
      },
      100
    );
  }


  function calcDimensions() {
    boxDiv.cumulativeLeft = 0;
    var o = boxDiv;
    do { boxDiv.cumulativeLeft += o.offsetLeft; } while (o = o.offsetParent);

    pageWidth = pageDivs[0].offsetWidth;
    var colWidth = pageDivs[0].scrollerDiv.offsetWidth;
    for (var i = 0; i < pageDivs.length; ++i) {
      pageDivs[i].contentDiv.style.webkitColumnWidth = colWidth + "px";
    }

    moveToPage(pageNumber());
  }


  function pageNumber(options) {
    options = options || { div: 0 };
    var place = book.placeFor(pageDivs[options.div].contentDiv);
    return place ? (place.pageNumber() || 1) : 1;
  }


  // Returns the current "place" in the book -- ie, the page number, chapter
  // title, etc.
  //
  function getPlace() {
    return book.placeFor(pageDivs[0].contentDiv);
  }


  // Flips to the given page within the current component. If pageN is
  // greater than the number of pages in this component, overflows into
  // subsequent components.
  //
  function moveToPage(pageN) {
    pageN = setPage(pageDivs[0], pageN);
    setPage(pageDivs[1], pageN, getPlace().component().id);
    completedTurn();
  }


  // Flips to the page approximately 'percent' of the way
  // through the component. Percent, contrary to expectations perhaps,
  // should be a float, where 0.0 is the first page and 1.0 is the last page
  // of the component.
  //
  function moveToPercentageThrough(percent) {
    if (percent == 0) {
      return moveToPage(1);
    }

    moveToPage(getPlace().pageAtPercentageThrough(percent));
    completedTurn();
  }


  // Moves to the relevant element in the relevant component.
  //
  function skipToChapter(src) {
    // TODO
    completedTurn();
  }



  // Private method that tells the book to update the given pageElement to
  // the given page.
  function setPage(pageElement, pageN, componentId) {
    pageN = book.changePage(pageElement.contentDiv, pageN, componentId);
    if (!pageN) { return false; } // Book may disallow movement to this page.
    setRunningHead(
      pageElement.footer,
      {
        left: getPlace().chapterTitle() || '',
        right: pageN
      }
    );
    return pageN;
  }


  // Takes an x point for the entire page, and finds the x point relative
  // to the left of the boxDiv.
  //
  function rebaseX(x) {
    return Math.max(
      Math.min(boxDiv.offsetWidth, x - boxDiv.cumulativeLeft),
      0
    );
  }


  // Returns to if the boxDiv-based x point is in the "Go forward" zone for
  // user turning a page.
  //
  function inForwardZone(x) {
    return x > pageWidth * 0.5;
  }


  // Returns to if the boxDiv-based x point is in the "Go backward" zone for
  // user turning a page.
  //
  function inBackwardZone(x) {
    return x < pageWidth * 0.5;
  }


  function lift(boxPointX) {
    if (turnData.direction) { return; }
    if (inForwardZone(boxPointX)) {
      showOverPage();
      if (setPage(pageDivs[0], pageNumber() + 1)) {
        turnData.direction = FORWARDS;
      }
    } else if (inBackwardZone(boxPointX)) {
      if (setPage(pageDivs[1], pageNumber() - 1)) {
        jumpOut();
        // NB: we'll leave the opacity adjustment of overPage to turning/turn.
        // Otherwise we get a flicker in some 3D-enhanced user agents.
        turnData.direction = BACKWARDS;
      }
    }
  }


  function turning(boxPointX) {
    if (!turnData.direction || turnData.completing) { return; }
    if (turnData.direction == FORWARDS && !inForwardZone(boxPointX)) {
      turnData.cancellable = true;
    } else if (turnData.direction == BACKWARDS && !inBackwardZone(boxPointX)) {
      turnData.cancellable = true;
    }

    // For speed reasons, we constrain movements to a constant number per second.
    var stamp = (new Date()).getTime();
    var followInterval = followCursorDuration * 0.75;
    if (turnData.stamp && stamp - turnData.stamp < followInterval) { return; }
    turnData.stamp = stamp;

    if (turnData.direction == BACKWARDS) {
      showOverPage();
    }
    slideToCursor(boxPointX);
  }


  function turn(boxPointX) {
    turnData.completing = true;
    if (turnData.direction == FORWARDS) {
      if (turnData.cancellable && inForwardZone(boxPointX)) {
        // Cancelling forward turn
        slideIn(boxPointX);
      } else {
        // Completing forward turn
        slideOut(boxPointX);
      }
    } else if (turnData.direction == BACKWARDS) {
      showOverPage();
      if (turnData.cancellable && inBackwardZone(boxPointX)) {
        // Cancelling backward turn
        slideOut(boxPointX);
      } else {
        // Completing backward turn
        slideIn(boxPointX);
      }
    }
  }


  function completedTurn() {
    turnData = {};
    var turnEvt = document.createEvent("Events");
    turnEvt.initEvent("carlyle:turn", false, true);
    boxDiv.dispatchEvent(turnEvt);
    pageDivs[1].style.opacity = 0.01;
    jumpIn();
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
    setX(pageDivs[1], 0, { duration: 0 });
  }


  function jumpOut() {
    // FIXME: the 10 is magic, and needs to be sensitive to style changes.
    setX(pageDivs[1], 0 - (pageWidth + 10), { duration: 0 });
  }


  function slideIn(cursorX) {
    var retreatFn = function () {
      setPage(pageDivs[0], pageNumber() - 1);
      completedTurn();
    }
    var slideOpts = {
      duration: slideDuration, //(pageWidth - cursorX) * slideSpeedDivisor,
      timing: 'ease-in'
    };
    setX(pageDivs[1], 0, slideOpts, retreatFn);
  }


  function slideOut(cursorX) {
    var advanceFn = function () {
      setPage(pageDivs[1], pageNumber({ div: 1 }) + 1);
      completedTurn();
    }
    var slideOpts = {
      duration: slideDuration, //cursorX * slideSpeedDivisor,
      timing: 'ease-in'
    };
    // FIXME: the 10 is magic, and needs to be sensitive to style changes.
    setX(pageDivs[1], 0 - (pageWidth + 10), slideOpts, advanceFn);
  }


  function slideToCursor(cursorX) {
    setX(pageDivs[1], cursorX - pageWidth, { duration: followCursorDuration });
  }


  function showOverPage() {
    if (pageDivs[1].style.opacity != 1) {
      pageDivs[1].style.opacity = 1;
    }
  }


  function hideOverPage() {
    if (pageDivs[1].style.opacity != 0.01) {
      pageDivs[1].style.opacity = 0.01;
    }
  }


  function createRunningHead(page, name) {
    var runner = page[name] = document.createElement('div');
    runner.style.cssText = Carlyle.Styles.ruleText(name);
    page.appendChild(runner);

    var createRunnerPart = function (name, styleName) {
      var part = runner[name] = document.createElement('div');
      part.style.cssText = Carlyle.Styles.ruleText(styleName);
      runner.appendChild(part);
    }
    createRunnerPart('left', 'runnerLeft');
    createRunnerPart('right', 'runnerRight');
  }


  function setRunningHead(runner, text) {
    var left = runner.left.innerHTML;
    var right = runner.right.innerHTML;
    if (typeof(text) == "string") {
      left = text;
      right = "";
    } else {
      left = text.left || left;
      right = text.right || right;
    }
    runner.left.innerHTML = left;
    runner.right.innerHTML = right;
  }


  function spin() {
    if (Carlyle.Spinner && !spinner) {
      spinner = new Carlyle.Spinner(boxDiv);
    }
  }


  function spun() {
    if (spinner) {
      spinner.stop();
      spinner = null;
    }
  }


  function listenForInteraction() {
    // Listeners
    // FIXME: should everything be registered with useCapture false?
    var receivesTouchEvents = (typeof Touch == "object");
    if (!receivesTouchEvents) {
      containerDiv.addEventListener(
        'mousedown',
        function (evt) {
          evt.preventDefault();
          lift(rebaseX(evt.pageX));
          containerDiv.onmousemove = function (mmevt) {
            mmevt.preventDefault();
            turning(rebaseX(mmevt.pageX));
          }
        },
        false
      );
      containerDiv.addEventListener(
        'mouseup',
        function (evt) {
          evt.preventDefault();
          containerDiv.onmousemove = null;
          if (!turnData.direction) { return; }
          turn(rebaseX(evt.pageX));
        },
        false
      );
      containerDiv.addEventListener(
        'mouseout',
        function (evt) {
          if (!turnData.direction) { return; }
          obj = evt.relatedTarget;
          while (obj && (obj = obj.parentNode)) {
            if (obj == containerDiv) { return; }
          }
          evt.preventDefault();
          turn(rebaseX(evt.pageX));
        },
        false
      );
    } else {
      containerDiv.addEventListener(
        'touchstart',
        function (evt) {
          evt.preventDefault();
          if (evt.targetTouches.length > 1) { return; }
          lift(rebaseX(evt.targetTouches[0].pageX));
        },
        false
      );
      containerDiv.addEventListener(
        'touchmove',
        function (evt) {
          evt.preventDefault();
          if (!turnData.direction) { return; }
          if (evt.targetTouches.length > 1) { return; }
          var rawX = evt.targetTouches[0].pageX - boxDiv.cumulativeLeft;
          var rbX = rebaseX(evt.targetTouches[0].pageX);
          if (rawX < 0 || rawX > boxDiv.offsetWidth) {
            turn(rbX);
          } else {
            turning(rbX);
          }
        },
        false
      );
      containerDiv.addEventListener(
        'touchend',
        function (evt) {
          evt.preventDefault();
          if (!turnData.direction) { return; }
          turn(rebaseX(evt.changedTouches[0].pageX));
        },
        false
      );
      containerDiv.addEventListener(
        'touchcancel',
        function (evt) {
          if (!turnData.direction) { return; }
          evt.preventDefault();
          turn(rebaseX(evt.changedTouches[0].pageX));
        }
      );
      window.addEventListener('orientationchange', resized, false);
    }
  }


  initialize(node, bookData);


  var PublicAPI = {
    constructor: Carlyle.Reader,
    setBook: setBook,
    getBook: getBook,
    getPlace: getPlace,
    moveToPage: moveToPage,
    moveToPercentageThrough: moveToPercentageThrough,
    skipToChapter: skipToChapter,
    resized: resized,
    spin: spin,
    spun: spun
  }

  return PublicAPI;
}
