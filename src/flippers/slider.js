Monocle.Flippers.Slider = function (reader) {
  if (Monocle.Flippers == this) {
    return new Monocle.Flippers.Slider(reader);
  }

  var API = { constructor: Monocle.Flippers.Slider }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 2,
    activeIndex: 1,
    turnData: {}
  }


  function initialize() {
    p.reader = reader;
  }


  function addPage(pageDiv) {
    pageDiv.m.dimensions = new Monocle.Dimensions.Columns(pageDiv);

    // BROWSERHACK: Firefox 4 is prone to beachballing on the first page turn
    // unless a zeroed translateX has been applied to the page div.
    Monocle.Styles.setX(pageDiv, "0px");
  }


  function visiblePages() {
    return [upperPage()];
  }


  function listenForInteraction(panelClass) {
    // BROWSERHACK: Firstly, prime interactiveMode for buggy iOS WebKit.
    interactiveMode(true);
    interactiveMode(false);

    if (typeof panelClass != "function") {
      panelClass = k.DEFAULT_PANELS_CLASS;
      if (!panelClass) {
        console.warn("Invalid panel class.")
      }
    }
    var q = function (action, panel, x) {
      var dir = panel.properties.direction;
      if (action == "lift") {
        lift(dir, x);
      } else if (action == "release") {
        release(dir, x);
      }
    }
    p.panels = new panelClass(
      API,
      {
        'start': function (panel, x) { q('lift', panel, x); },
        'move': function (panel, x) { turning(panel.properties.direction, x); },
        'end': function (panel, x) { q('release', panel, x); },
        'cancel': function (panel, x) { q('release', panel, x); }
      }
    );
  }


  // A panel can call this with true/false to indicate that the user needs
  // to be able to select or otherwise interact with text.
  function interactiveMode(bState) {
    p.reader.dispatchEvent('monocle:interactive:'+(bState ? 'on' : 'off'));
    if (!Monocle.Browser.env.selectIgnoresZOrder) { return; }
    if (p.interactive = bState) {
      if (p.activeIndex != 0) {
        var place = getPlace();
        if (place) {
          setPage(
            p.reader.dom.find('page', 0),
            place.getLocus(),
            function () {
              flipPages();
              prepareNextPage();
            }
          );
        } else {
          flipPages();
        }
      }
    }
  }


  function getPlace(pageDiv) {
    pageDiv = pageDiv || upperPage();
    return pageDiv.m ? pageDiv.m.place : null;
  }


  function moveTo(locus, callback) {
    var fn = function () {
      prepareNextPage(function () {
        if (typeof callback == "function") { callback(); }
        announceTurn();
      });
    }
    setPage(upperPage(), locus, fn);
  }


  function setPage(pageDiv, locus, callback) {
    ensureWaitControl();
    p.reader.getBook().setOrLoadPageAt(
      pageDiv,
      locus,
      function (locus) {
        pageDiv.m.dimensions.translateToLocus(locus);
        if (callback) { callback(); }
      }
    );
  }


  function upperPage() {
    return p.reader.dom.find('page', p.activeIndex);
  }


  function lowerPage() {
    return p.reader.dom.find('page', (p.activeIndex + 1) % 2);
  }


  function flipPages() {
    upperPage().style.zIndex = 1;
    lowerPage().style.zIndex = 2;
    return p.activeIndex = (p.activeIndex + 1) % 2;
  }


  function lift(dir, boxPointX) {
    if (p.turnData.lifting || p.turnData.releasing) { return; }

    p.turnData.points = {
      start: boxPointX,
      min: boxPointX,
      max: boxPointX
    }
    p.turnData.lifting = true;

    if (dir == k.FORWARDS) {
      if (getPlace().onLastPageOfBook()) {
        p.reader.dispatchEvent(
          'monocle:boundaryend',
          {
            locus: getPlace().getLocus({ direction : dir }),
            page: upperPage()
          }
        );
        resetTurnData();
        return;
      }
      onGoingForward(boxPointX);
    } else if (dir == k.BACKWARDS) {
      if (getPlace().onFirstPageOfBook()) {
        p.reader.dispatchEvent(
          'monocle:boundarystart',
          {
            locus: getPlace().getLocus({ direction : dir }),
            page: upperPage()
          }
        );
        resetTurnData();
        return;
      }
      onGoingBackward(boxPointX);
    } else {
      console.warn("Invalid direction: " + dir);
    }
  }


  function turning(dir, boxPointX) {
    if (!p.turnData.points) { return; }
    if (p.turnData.lifting || p.turnData.releasing) { return; }
    checkPoint(boxPointX);
    slideToCursor(boxPointX, null, "0");
  }


  function release(dir, boxPointX) {
    if (!p.turnData.points) {
      return;
    }
    if (p.turnData.lifting) {
      p.turnData.releaseArgs = [dir, boxPointX];
      return;
    }
    if (p.turnData.releasing) {
      return;
    }

    checkPoint(boxPointX);

    p.turnData.releasing = true;
    showWaitControl(lowerPage());

    if (dir == k.FORWARDS) {
      if (
        p.turnData.points.tap ||
        p.turnData.points.start - boxPointX > 60 ||
        p.turnData.points.min >= boxPointX
      ) {
        // Completing forward turn
        slideOut(afterGoingForward);
      } else {
        // Cancelling forward turn
        slideIn(afterCancellingForward);
      }
    } else if (dir == k.BACKWARDS) {
      if (
        p.turnData.points.tap ||
        boxPointX - p.turnData.points.start > 60 ||
        p.turnData.points.max <= boxPointX
      ) {
        // Completing backward turn
        slideIn(afterGoingBackward);
      } else {
        // Cancelling backward turn
        slideOut(afterCancellingBackward);
      }
    } else {
      console.warn("Invalid direction: " + dir);
    }
  }


  function checkPoint(boxPointX) {
    p.turnData.points.min = Math.min(p.turnData.points.min, boxPointX);
    p.turnData.points.max = Math.max(p.turnData.points.max, boxPointX);
    p.turnData.points.tap = p.turnData.points.max - p.turnData.points.min < 10;
  }


  function onGoingForward(x) {
    lifted(x);
  }


  function onGoingBackward(x) {
    var lp = lowerPage(), up = upperPage();
    showWaitControl(up);
    jumpOut(lp, // move lower page off-screen
      function () {
        flipPages(); // flip lower to upper
        setPage( // set upper page to previous
          lp,
          getPlace(lowerPage()).getLocus({ direction: k.BACKWARDS }),
          function () {
            lifted(x);
            hideWaitControl(up);
          }
        );
      }
    );
  }


  function afterGoingForward() {
    var up = upperPage(), lp = lowerPage();
    if (p.interactive) {
      showWaitControl(up);
      showWaitControl(lp);
      setPage( // set upper (off screen) to current
        up,
        getPlace().getLocus({ direction: k.FORWARDS }),
        function () {
          // move upper back onto screen
          // then set lower to next and reset turn
          jumpIn(up, function () { prepareNextPage(announceTurn); });
        }
      );
    } else {
      showWaitControl(lp);
      flipPages();
      jumpIn(up, function () { prepareNextPage(announceTurn); });
    }
  }


  function afterGoingBackward() {
    if (p.interactive) {
      setPage( // set lower page to current
        lowerPage(),
        getPlace().getLocus(),
        function () {
          flipPages(); // flip lower to upper
          // set lower to next and reset turn:
          prepareNextPage(announceTurn);
        }
      );
    } else {
      announceTurn();
    }
  }


  function afterCancellingForward() {
    resetTurnData();
  }


  function afterCancellingBackward() {
    flipPages(); // flip upper to lower
    jumpIn( // move lower back onto screen
      lowerPage(),
      function () { prepareNextPage(resetTurnData); }
    );
  }


  function prepareNextPage(callback) {
    setPage(
      lowerPage(),
      getPlace().getLocus({ direction: k.FORWARDS }),
      callback
    );
  }


  function lifted(x) {
    p.turnData.lifting = false;
    var releaseArgs = p.turnData.releaseArgs;
    if (releaseArgs) {
      p.turnData.releaseArgs = null;
      release(releaseArgs[0], releaseArgs[1]);
    } else if (x) {
      slideToCursor(x);
    }
  }


  function announceTurn() {
    p.reader.dispatchEvent('monocle:turn');
    resetTurnData();
  }


  function resetTurnData() {
    hideWaitControl(upperPage());
    hideWaitControl(lowerPage());
    p.turnData = {};
  }


  function setX(elem, x, options, callback) {
    var duration;

    if (!options.duration) {
      duration = 0;
    } else {
      duration = parseInt(options['duration']);
    }

    if (typeof(x) == "number") { x = x + "px"; }

    // BROWSERHACK: WEBKIT (transitions & transition events)
    if (typeof WebKitTransitionEvent != "undefined") {
      if (duration) {
        // Accelerate durations if we have a backlog of work...
        transition = '-webkit-transform';
        transition += ' ' + duration + "ms";
        transition += ' ' + (options['timing'] || 'linear');
        transition += ' ' + (options['delay'] || 0) + 'ms';
      } else {
        transition = 'none';
      }
      elem.style.webkitTransition = transition;
      if (Monocle.Browser.env.supportsTransform3d) {
        elem.style.webkitTransform = "translate3d("+x+",0,0)";
      } else {
        elem.style.webkitTransform = "translateX("+x+")";
      }

    // BROWSERHACK: NON-WEBKIT (no transitions)
    } else if (duration > 0) {
      // Exit any existing transition loop.
      clearTimeout(elem.setXTransitionInterval)

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
          clearTimeout(elem.setXTransitionInterval);
          Monocle.Styles.setX(elem, finalX);
          if (elem.setXTCB) {
            elem.setXTCB();
          }
        } else {
          Monocle.Styles.setX(elem, destX);
          currX = destX;
        }
      }

      elem.setXTransitionInterval = setInterval(stepFn, frameRate);
    } else {
      Monocle.Styles.setX(elem, x);
    }

    if (elem.setXTCB) {
      Monocle.Events.deafen(elem, 'webkitTransitionEnd', elem.setXTCB);
      elem.setXTCB = null;
    }

    elem.setXTCB = function () {
      if (callback) { callback(); }
    }

    var sX = getX(elem);
    if (!duration || sX == parseInt(x)) {
      elem.setXTCB();
    } else {
      Monocle.Events.listen(elem, 'webkitTransitionEnd', elem.setXTCB);
    }
  }


  // This is a replacement setX with better cross-browser support.
  // Two problems keep it from going in:
  //
  // * It removes the simulated transition support required for Moz less than 4.
  // * getX is still not cross-browser, so it sometimes fails to detect when
  //   a transition has already occurred. Resulting in freezes.
  /*
  function setX(elem, x, options, callback) {
    var duration, transition;

    // NB: if the browser lacks transition support, moves immediately to x.
    if (!Monocle.Browser.env.supportsTransitions) {
      duration = 0;
    } else if (!options.duration) {
      duration = 0;
    } else {
      duration = parseInt(options['duration']);
    }

    if (typeof(x) == "number") { x = x + "px"; }

    if (duration) {
      transition = duration + "ms";
      transition += ' ' + (options['timing'] || 'linear');
      transition += ' ' + (options['delay'] || 0) + 'ms';
    } else {
      transition = "none";
    }

    if (elem.setXTCB) {
      Monocle.Events.deafen(elem, 'webkitTransitionEnd', elem.setXTCB);
      Monocle.Events.deafen(elem, 'transitionend', elem.setXTCB);
      elem.setXTCB = null;
    }

    elem.setXTCB = function () {
      if (callback) { callback(); }
    }

    // Set the styles
    elem.dom.setBetaStyle('transition', transition);
    if (Monocle.Browser.env.supportsTransform3d) {
      elem.dom.setBetaStyle('transform', 'translate3d('+x+',0,0)');
    } else {
      elem.dom.setBetaStyle('transform', 'translateX('+x+')');
    }

    if (!duration) {
      elem.setXTCB();
    } else {
      Monocle.Events.listen(elem, 'webkitTransitionEnd', elem.setXTCB);
      Monocle.Events.listen(elem, 'transitionend', elem.setXTCB);
    }
  }
  */


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


  function jumpIn(pageDiv, callback) {
    Monocle.defer(function () {
      setX(pageDiv, 0, { duration: 0 }, callback);
    });
  }


  function jumpOut(pageDiv, callback) {
    Monocle.defer(function () {
      setX(pageDiv, 0 - pageDiv.offsetWidth, { duration: 0 }, callback);
    });
  }


  // NB: Slides are always done by the visible upper page.

  function slideIn(callback) {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    Monocle.defer(function () {
      setX(upperPage(), 0, slideOpts, callback);
    });
  }


  function slideOut(callback) {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    Monocle.defer(function () {
      setX(upperPage(), 0 - upperPage().offsetWidth, slideOpts, callback);
    });
  }


  function slideToCursor(cursorX, callback, duration) {
    setX(
      upperPage(),
      Math.min(0, cursorX - upperPage().offsetWidth),
      { duration: duration || k.durations.FOLLOW_CURSOR },
      callback
    );
  }


  function ensureWaitControl() {
    if (p.waitControl) { return; }
    p.waitControl = {
      createControlElements: function (holder) {
        return holder.dom.make('div', 'flippers_slider_wait');
      }
    }
    p.reader.addControl(p.waitControl, 'page');
  }


  function showWaitControl(page) {
    var ctrl = p.reader.dom.find('flippers_slider_wait', page.m.pageIndex);
    ctrl.style.visibility = "visible";
  }


  function hideWaitControl(page) {
    var ctrl = p.reader.dom.find('flippers_slider_wait', page.m.pageIndex);
    ctrl.style.visibility = "hidden";
  }

  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;

  // OPTIONAL API - WILL BE INVOKED (WHERE RELEVANT) IF PROVIDED.
  API.visiblePages = visiblePages;
  API.interactiveMode = interactiveMode;

  initialize();

  return API;
}


// Constants
Monocle.Flippers.Slider.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;
Monocle.Flippers.Slider.FORWARDS = 1;
Monocle.Flippers.Slider.BACKWARDS = -1;
Monocle.Flippers.Slider.durations = {
  SLIDE: 220,
  FOLLOW_CURSOR: 100
}

Monocle.pieceLoaded('flippers/slider');
