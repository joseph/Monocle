Monocle.Flippers.Slider = function (reader, setPageFn) {
  if (Monocle.Flippers == this) {
    return new Monocle.Flippers.Slider(reader, setPageFn);
  }

  var API = { constructor: Monocle.Flippers.Slider }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 2,
    activeIndex: 1,
    divs: {
      pages: []
    },
    queues: {
      lift: [],
      drop: []
    },
    // Properties relating to the current page turn interaction.
    turnData: {}
  }


  function initialize() {
    p.reader = reader;
    p.setPageFn = setPageFn;
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
    }
    p.panels = new panelClass(
      API,
      {
        'start': function (panel, x) { lift(panel.properties.direction, x); },
        'move': function (panel, x) { turning(panel.properties.direction, x); },
        'end': function (panel, x) { drop(panel.properties.direction, x); },
        'cancel': function (panel, x) { drop(panel.properties.direction, x); }
      }
    );
  }


  function getPlace(pageDiv) {
    pageDiv = pageDiv || upperPage();
    return pageDiv.m ? pageDiv.m.place : null;
  }


  function moveTo(locus) {
    setPage(
      upperPage(),
      locus,
      completedTurn,
      function () { console.log("FAILED TO MOVE TO LOCUS"); }
    );
  }


  function setPage(pageDiv, locus, callback, failCallback) {
    var spCallback = function (offset) {
      pageDiv.m.activeFrame.style.visibility = "visible";
      pageDiv.m.sheafDiv.style.background = "none";
      if (pageDiv.m.completeWhenReady) {
        pageDiv.m.completeWhenReady();
      }

      if (offset === 'disallow') {
        if (typeof failCallback == 'function') { failCallback(); }
        p.turnData = {};
        return;
      }
      var bdy = pageDiv.m.activeFrame.contentDocument.body;
      Monocle.Styles.affix(bdy, "transform", "translateX("+(0-offset)+"px)");
      if (callback) { callback(); }
    }
    pageDiv.m.sheafDiv.style.background = "url("+k.WAITLINE+")";
    pageDiv.m.activeFrame.style.visibility = "hidden";
    p.setPageFn(pageDiv, locus, spCallback);
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


  function lift(dir, boxPointX) {
    if (p.turnData.animating || upperPage().m.pageChanging) {
      p.queues.lift.push([dir, boxPointX]);
      return;
    }

    p.turnData.points = {
      start: boxPointX,
      min: boxPointX,
      max: boxPointX
    }

    if (dir == k.FORWARDS) {
      if (onLastPage()) {
        console.log("ON LAST PAGE");
        p.turnData = {};
        return;
      }
      slideToCursor(boxPointX, shiftDropQueue);
    } else if (dir == k.BACKWARDS) {
      var backwardsTurn = function () {
        if (lowerPage().m.pageChanging) {
          lowerPage().m.completeWhenReady = backwardsTurn;
          p.turnData.animating = true;
          return;
        }
        lowerPage().m.completeWhenReady = null;

        if (onFirstPage()) {
          console.log("ON FIRST PAGE");
          p.turnData = {};
          return;
        }

        p.turnData.animating = true;
        jumpOut(function () {
          var place = getPlace();
          setPage(lowerPage(), place.getLocus({ direction: k.BACKWARDS }));
          flipPages();
          slideToCursor(boxPointX, shiftDropQueue);
        });
      }
      backwardsTurn();
    }
  }


  function turning(dir, boxPointX) {
    if (p.turnData.animating) {
      return;
    }

    if (!p.turnData.points) {
      return;
    }

    p.turnData.points.min = Math.min(p.turnData.points.min, boxPointX);
    p.turnData.points.max = Math.max(p.turnData.points.max, boxPointX);

    slideToCursor(boxPointX, null, "0");
  }


  function drop(dir, boxPointX) {
    if (p.turnData.animating) {
      p.queues.drop.push([dir, boxPointX]);
      return;
    }

    if (!p.turnData.points) {
      return;
    }

    slideToCursor(boxPointX, null, "0");

    p.turnData.points.tap = p.turnData.points.max - p.turnData.points.min < 10;

    if (dir == k.FORWARDS) {
      if (
        p.turnData.points.tap ||
        p.turnData.points.start - boxPointX > 60 ||
        p.turnData.points.min >= boxPointX
      ) {
        // Completing forward turn
        slideOut();
      } else {
        // Cancelling forward turn
        slideIn();
      }
    } else if (dir == k.BACKWARDS) {
      if (
        p.turnData.points.tap ||
        boxPointX - p.turnData.points.start > 60 ||
        p.turnData.points.max <= boxPointX
      ) {
        // Completing backward turn
        slideIn();
      } else {
        // Cancelling backward turn
        slideOut();
      }
    }
  }


  function completedTurn() {
    p.turnData.animating = true;
    if (upperPage().m.pageChanging) {
      upperPage().m.completeWhenReady = completedTurn;
      return;
    }
    upperPage().m.completeWhenReady = null;

    jumpIn(function () {
      p.turnData = {}
      if (p.queues.lift.length) {
        var liftData = p.queues.lift.shift();
        lift(liftData[0], liftData[1]);
      }
      setPage(
        lowerPage(),
        getPlace().getLocus({ direction: k.FORWARDS }),
        function () {
          p.reader.dispatchEvent('monocle:turn');
        }
      );
    });
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
        if (p.queues.lift.length) {
          duration /= p.queues.lift.length + 1;
        }
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

    var sX = getX(elem);
    if (!duration || sX == parseInt(x)) {
      if (callback) { callback(); }
    } else {
      elem.setXTCB = function () {
        p.turnData.animating = false;
        if (callback) { callback(); }
      }
      Monocle.Events.listen(elem, 'webkitTransitionEnd', elem.setXTCB);
    }
  }


  function shiftDropQueue() {
    if (p.queues.drop.length) {
      var dropData = p.queues.drop.shift();
      drop(dropData[0], dropData[1]);
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
      0 - p.reader.properties.pageWidth,
      { duration: 0 },
      callback
    );
  }


  function jumpToCursor(cursorX, callback) {
    setX(
      lowerPage(),
      Math.min(0, cursorX - p.reader.properties.pageWidth),
      { duration: 0 },
      callback
    );
  }


  /* NB: Slides are always done by the visible upper page. */

  function slideIn() {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    p.turnData.animating = true;
    setX(upperPage(), 0, slideOpts, completedTurn);
  }


  function slideOut() {
    var slideOpts = {
      duration: k.durations.SLIDE,
      timing: 'ease-in'
    };
    var callback = function () { flipPages(); completedTurn(); }
    p.turnData.animating = true;
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
  SLIDE: 200,
  FOLLOW_CURSOR: 150
}
Monocle.Flippers.Slider.WAITLINE = "data:image/gif;base64," +
  "R0lGODlhAgAUAIAAAN3d3f%2F%2F%2FyH5BAEHAAEALAAAAAACABQAAAIHjI95EKyfCgA7"


Monocle.pieceLoaded('flippers/slider');
