Monocle.Flippers.Slider = function (reader) {
  if (Monocle.Flippers == this) {
    return new Monocle.Flippers.Slider(reader);
  }

  var API = { constructor: Monocle.Flippers.Slider }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 2,
    activeIndex: 1,
    divs: {
      pages: []
    },
    turnData: {},
  }


  function initialize() {
    p.reader = reader;
  }


  function addPage(pageDiv) {
    p.divs.pages.push(pageDiv);
  }


  function visiblePages() {
    return [upperPage()];
  }


  function listenForInteraction(panelClass) {
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
      } else if (action == "drop") {
        drop(dir, x);
      }
    }
    p.panels = new panelClass(
      API,
      {
        'start': function (panel, x) { q('lift', panel, x); },
        'move': function (panel, x) { turning(panel.properties.direction, x); },
        'end': function (panel, x) { q('drop', panel, x); },
        'cancel': function (panel, x) { q('drop', panel, x); }
      }
    );
  }


  function getPlace(pageDiv) {
    pageDiv = pageDiv || upperPage();
    return pageDiv.m ? pageDiv.m.place : null;
  }


  function moveTo(locus) {
    setPage(upperPage(), locus, completedTurn);
  }


  function setPage(pageDiv, locus, callback) {
    p.reader.getBook().setOrLoadPageAt(
      pageDiv,
      locus,
      function (locus) {
        var mult = locus.page - 1;
        var pw = pageDiv.m.sheafDiv.clientWidth;
        var x = 0 - pw * mult;
        var bdy = pageDiv.m.activeFrame.contentDocument.body;
        Monocle.Styles.affix(bdy, "transform", "translateX("+x+"px)");
        if (callback) { callback(); }
      }
    );
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


  function onFirstPage() {
    var place = getPlace();
    return place.properties.component.properties.index == 0 &&
      place.pageNumber() == 1;
  }


  function onLastPage() {
    var place = getPlace();
    var cmpt = place.properties.component;
    return cmpt.properties.index == cmpt.properties.book.properties.lastCIndex &&
      place.pageNumber() == cmpt.lastPageNumber();
  }


  function resetTurnData() {
    p.turnData = {};
  }


  function lift(dir, boxPointX) {
    if (p.turnData.completing) { return; }

    p.turnData.points = {
      start: boxPointX,
      min: boxPointX,
      max: boxPointX
    }

    if (dir == k.FORWARDS) {
      if (onLastPage()) {
        //console.log("ON LAST PAGE");
        resetTurnData();
        return;
      }
      beforeGoingForward(function () { slideToCursor(boxPointX); });
    } else if (dir == k.BACKWARDS) {
      if (onFirstPage()) {
        //console.log("ON FIRST PAGE");
        resetTurnData();
        return;
      }
      beforeGoingBackward(function () { slideToCursor(boxPointX); });
    } else {
      console.warn("Invalid direction: " + dir);
    }
  }


  function turning(dir, boxPointX) {
    if (!p.turnData.points) { return; }
    if (p.turnData.completing) { return; }
    checkPoint(boxPointX);
    slideToCursor(boxPointX, null, "0");
  }


  function drop(dir, boxPointX, forceComplete) {
    if (!p.turnData.points) {
      return;
    }
    if (p.turnData.completing) {
      return;
    }

    slideToCursor(boxPointX, null, "0");

    checkPoint(boxPointX);

    p.turnData.completing = true;

    if (dir == k.FORWARDS) {
      if (
        forceComplete ||
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
        forceComplete ||
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


  function beforeGoingForward(callback) {
    callback();
  }


  function beforeGoingBackward(callback) {
    var lp = lowerPage();
    jumpOut(lp, // move lower page off-screen
      function () {
        setPage( // set lower page to previous
          lp,
          getPlace().getLocus({ direction: k.BACKWARDS }),
          function () {
            flipPages(); // flip lower to upper
            callback();
          }
        );
      }
    );
  }


  function afterGoingForward() {
    var up = upperPage();
    if (Monocle.Browser.has.selectThruBug) {
      setPage( // set upper (off screen) to current
        up,
        getPlace().getLocus({ direction: k.FORWARDS }),
        function () {
          jumpIn(up, // move upper back onto screen
            completedTurn // set lower to next and reset turn
          );
        }
      );
    } else {
      flipPages();
      jumpIn(up, completedTurn);
    }
  }


  function afterGoingBackward() {
    if (Monocle.Browser.has.selectThruBug) {
      setPage( // set lower page to current
        lowerPage(),
        getPlace().getLocus(),
        function () {
          flipPages(); // flip lower to upper
          completedTurn(); // set lower to next and reset turn
        }
      );
    } else {
      completedTurn();
    }
  }


  function afterCancellingForward() {
    cancelledTurn(); // set lower to next (FIXME: already done?) and reset turn
  }


  function afterCancellingBackward() {
    flipPages(); // flip upper to lower
    jumpIn( // move lower back onto screen
      lowerPage(),
      cancelledTurn // set lower to next and reset turn
    );
  }


  function completedTurn() {
    setPage(
      lowerPage(),
      getPlace().getLocus({ direction: k.FORWARDS }),
      function () {
        p.reader.dispatchEvent('monocle:turn');
        resetTurnData();
      }
    );
  }


  function cancelledTurn() {
    setPage(
      lowerPage(),
      getPlace().getLocus({ direction: k.FORWARDS }),
      resetTurnData
    );
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
      elem.style.webkitTransform = "translate3d("+x+",0,0)";

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
    // Duration should be 0, but is set to 1 to address a 10.6 Safari bug.
    setX(pageDiv, 0, { duration: 1 }, callback);
  }


  function jumpOut(pageDiv, callback) {
    setX(
      pageDiv,
      0 - p.reader.properties.pageWidth,
      { duration: 1 },
      callback
    );
  }


  // NB: Slides are always done by the visible upper page.

  function slideIn(callback) {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    setX(upperPage(), 0, slideOpts, callback);
  }


  function slideOut(callback) {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    setX(upperPage(), 0 - p.reader.properties.pageWidth, slideOpts, callback);
  }


  function slideToCursor(cursorX, callback, duration) {
    setX(
      upperPage(),
      Math.min(0, cursorX - p.reader.properties.pageWidth),
      { duration: duration || k.durations.FOLLOW_CURSOR },
      callback
    );
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  API.visiblePages = visiblePages;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;

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
