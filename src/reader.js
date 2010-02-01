/* READER */
Carlyle.Reader = function (node, bookData) {
  if (Carlyle == this) { return new Carlyle.Reader(node, bookData); }

  var FORWARDS = 1, BACKWARDS = -1;

  var boxDiv;
  var containerDiv;
  var spinnerCanvas;
  var pageDivs = [];
  var pageWidth = 0, colWidth = 0;
  var book;
  var turnData = {};
  var resizeTimer = null;

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

      pageDivs[i].bodyText = document.createElement('div');
      pageDivs[i].bodyText.style.cssText = Carlyle.Styles.ruleText('bodyText');
      pageDivs[i].appendChild(pageDivs[i].bodyText);

      pageDivs[i].content = document.createElement('div');
      pageDivs[i].content.pageDiv = pageDivs[i];
      pageDivs[i].content.style.cssText = Carlyle.Styles.ruleText('content');
      pageDivs[i].bodyText.appendChild(pageDivs[i].content);
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
        Carlyle.log('Recalculating dimensions after resize.')
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
    colWidth = pageDivs[0].bodyText.offsetWidth;
    for (var i = 0; i < pageDivs.length; ++i) {
      pageDivs[i].content.style.webkitColumnWidth = colWidth + "px";
    }

    pageDivs[0].content.dirty = true;
    pageDivs[1].content.dirty = true;

    goToPage(pageDivs[0].pageNumber || 1);
    setX(pageDivs[1], 0 - (pageWidth + 10), 'now');
  }


  // Goes to the given page within the component. If pageN is greater than
  // the number of pages in this component, overflows into subsequent
  // components.
  //
  function goToPage(pageN, componentId) {
    setPage(pageDivs[0], pageN, componentId);
    setPage(pageDivs[1], pageN, componentId);
    completedTurn();
  }


  // Goes to the given id within the component. If a blank id is given, just
  // goes to the first page of the component.
  //
  function goToChapter(chapterId, componentId) {
    if (!setPage(pageDivs[0], 1, componentId)) {
      return;
    }

    var pageN = 1;
    if (chapterId) {
      var chaps = pageDivs[0].content.componentData.chapters;
      for (var i = chaps.length - 1; i <= 0; --i) {
        if (chaps[i].id == chapterId) {
          pageN = chaps[i].page;
          break;
        }
      }
    }

    setPage(pageDivs[1], pageN, componentId);
    if (pageN != 1) {
      setPage(pageDivs[0], pageN, componentId);
    }
    completedTurn();
  }


  // Goes to the page approximately 'percent' of the way
  // through the component. Percent, contrary to expectations perhaps,
  // should be a float, where 0.0 is the first page and 1.0 is the last page
  // of the component.
  //
  function goToPercentageThrough(percent, componentId) {
    if (percent <= 0) {
      return goToPage(1, componentId);
    }

    if (!setPage(pageDivs[0], 1, componentId)) {
      return;
    }

    var cData = pageDivs[0].content.componentData;
    var pageN = Math.ceil(percent * cData.lastPageNumber);

    setPage(pageDivs[1], pageN, componentId);
    if (pageN != 1) {
      setPage(pageDivs[0], pageN, componentId);
    }
    completedTurn();
  }


  function getLocation() {
    var ct = pageDivs[0].content;
    var pageN = pageDivs[0].pageNumber;
    var chapter = null;
    for (var i = 0; i < ct.componentData.chapters.length; ++i) {
      if (pageN >= ct.componentData.chapters[i].page) {
        chapter = ct.componentData.chapters[i].title;
        break;
      }
    }
    return {
      component: ct.componentData.componentId,
      page: pageN,
      lastPage: ct.lastPageNumber,
      percentageThrough: pageN / ct.lastPageNumber,
      chapter: chapter
    }
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


  // Returns an x value (ready for the translateX() CSS function) that will
  // hide a page element.
  //
  // FIXME: Maybe a little inefficient as a method - can/ probably be
  // a property that is recalculated in calcDimensions?
  //
  function outOfSight() {
    return (0 - (pageWidth + 10)) + "px";
  }


  // Return an x value (ready for the translateX() CSS function) that will
  // show the entire page in the boxDiv. This is hardcoded to 0px, but
  // the method name makes code a bit more self-documenting.
  //
  // FIXME: Maybe a little inefficient as a method - can/ probably be
  // a property that is recalculated in calcDimensions?
  //
  function inFullView() {
    return "0px";
  }


  function lift(boxPointX) {
    if (turnData.direction) { return; }
    if (inForwardZone(boxPointX)) {
      setX(pageDivs[1], inFullView(), 'now');
      if (setPage(pageDivs[0], pageDivs[0].pageNumber + 1)) {
        turnData.direction = FORWARDS;
      } else {
        setX(pageDivs[1], outOfSight(), 'now');
      };
    } else if (inBackwardZone(boxPointX)) {
      if (setPage(pageDivs[1], pageDivs[1].pageNumber - 1)) {
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

    // For speed reasons, we constrain movements to ~12.5 per second at most.
    var stamp = (new Date()).getTime();
    if (turnData.stamp && stamp - turnData.stamp < 80) { return; }
    turnData.stamp = stamp;

    setX(pageDivs[1], boxPointX - pageWidth, { duration: 100 });
  }


  function turn(boxPointX) {
    turnData.completing = true;
    if (turnData.direction == FORWARDS) {
      if (turnData.cancellable && inForwardZone(boxPointX)) {
        // Cancelling forward turn...
        setX(
          pageDivs[1],
          inFullView(),
          'slide',
          function () {
            setPage(pageDivs[0], pageDivs[0].pageNumber - 1);
            setX(pageDivs[1], outOfSight(), 'now') ;
            completedTurn();
          }
        );
      } else {
        // Completing forward turn...
        setX(
          pageDivs[1],
          outOfSight(),
          'slide',
          function () {
            setPage(pageDivs[1], pageDivs[1].pageNumber + 1);
            completedTurn();
          }
        );
      }
    } else if (turnData.direction == BACKWARDS) {
      if (turnData.cancellable && inBackwardZone(boxPointX)) {
        // Cancelling backward turn...
        setX(
          pageDivs[1],
          outOfSight(),
          'slide',
          function () {
            setPage(pageDivs[1], pageDivs[1].pageNumber + 1);
            completedTurn();
          }
        );
      } else {
        // Completing backward turn...
        setX(
          pageDivs[1],
          inFullView(),
          'slide',
          function () {
            setPage(pageDivs[0], pageDivs[0].pageNumber - 1);
            setX(pageDivs[1], outOfSight(), 'now');
            completedTurn();
          }
        );
      }
    }
  }


  function completedTurn() {
    turnData = {};
    var turnEvt = document.createEvent("Events");
    turnEvt.initEvent("carlyle:turn", false, true);
    boxDiv.dispatchEvent(turnEvt);
  }



  function setX(elem, x, options, callback) {
    if (typeof(x) == "number") { x = x + "px"; }
    elem.style.webkitTransform = 'translateX('+x+')';

    var transition;
    var duration;

    // Shorthand for common configurations.
    if (options == "slide") {
      options = {};
    } else if (options == 'now') {
      options = { duration: 0 };
    }

    if (options['duration'] == 0) {
      duration = 0;
      transition = 'none';
    } else {
      duration = parseInt(options['duration']) || 200; // FIXME: Magic 200!
      transition = '-webkit-transform';
      transition += ' ' + duration + "ms";
      transition += ' ' + (options['timing'] || 'linear');
      transition += ' ' + (options['delay'] || 0) + 'ms';
    }
    elem.style.webkitTransition = transition;
    if (elem.setXTransitionCallback) {
      clearTimeout(elem.setXTransitionCallback);
    }
    if (callback) {
      elem.setXTransitionCallback = setTimeout(callback, duration + 1);
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


  function setPage(pageElement, pageN, componentId) {
    pageN = book.preparePageFor(pageElement.content, pageN, componentId);
    if (!pageN) { return false; } // Book may disallow movement to this page.
    pageElement.pageNumber = pageN;
    pageElement.bodyText.scrollLeft = (pageN - 1) * colWidth;
    setRunningHead(
      pageElement.footer,
      {
        left: getLocation().chapter,
        right: pageN
      }
    );
    return pageN;
  }


  function spin() {
    if (spinnerCanvas) { return; }
    spinnerCanvas = document.createElement("canvas");
    boxDiv.appendChild(spinnerCanvas);
    containerDiv.style.visibility = "hidden";
    spinnerCanvas.style.cssText = Carlyle.Styles.ruleText('spinner');

    var ctx = spinnerCanvas.getContext("2d");
    var w = spinnerCanvas.clientWidth, h = spinnerCanvas.clientHeight;
    var currentOffset = 0;
    var bars = 10;
    var innerRadius = w * 0.4;
    var size = { width: w * 0.16, height: w * 0.4 };
    var framerate = 1000 / 10;

    spinnerCanvas.tick = setInterval(
      function () {
        currentOffset = (currentOffset + 1) % bars;
        ctx.save();
        ctx.scale(1.5, 0.75);
        ctx.clearRect(0, 0, w*2, h*2);
        ctx.translate(w, h);
        for(var i = 0; i < bars; ++i){
          var curbar = (currentOffset+i) % bars;
          var angle = 2 * curbar * Math.PI / bars;
          ctx.save();
          ctx.translate(
            innerRadius * Math.sin(-angle),
            innerRadius * Math.cos(-angle)
          );
          ctx.rotate(angle);
          ctx.fillStyle = "rgba(0,12,48,"+(bars+1-i)/(bars+1)+")";
          ctx.fillRect(-2, 0, size.width, size.height);
          ctx.restore();
        }
        ctx.restore();
      },
      framerate
    );
  }


  function spun() {
    if (!spinnerCanvas) { return; }
    containerDiv.style.visibility = "visible";
    clearTimeout(spinnerCanvas.tick);
    boxDiv.removeChild(spinnerCanvas);
    spinnerCanvas = null;
  }


  function listenForInteraction() {


    // Listeners
    // FIXME: a better way to detect whether touch events are supported?
    // FIXME: should everything be register with useCapture false?
    var mob = navigator.userAgent.toLowerCase().search(/webkit.* mobile/) > 0;
    if (!mob) {
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
    goToPage: goToPage,
    goToChapter: goToChapter,
    goToPercentageThrough: goToPercentageThrough,
    getLocation: getLocation,
    resized: resized,
    spin: spin,
    spun: spun
  }

  return PublicAPI;
}

