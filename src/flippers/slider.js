Monocle.Flippers.Slider = function (reader, setPageFn) {
  if (Monocle.Flippers == this) {
    return new Monocle.Flippers.Slider(reader, setPageFn);
  }

  // Constants
  var k = Monocle.Flippers.Slider;

  // Properties
  var p = {
    pageCount: 2,
    activeIndex: 1,
    divs: {
      pages: []
    },
    // Properties relating to the current page turn interaction.
    turnData: {}
  }

  var API = {
    constructor: k,
    properties: p,
    constants: k
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
    panelClass = panelClass || k.DEFAULT_PANELS_CLASS;
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
      if (offset === 'disallow') {
        if (typeof failCallback == 'function') { failCallback(); }
        p.turnData = {};
        return;
      }
      var bdy = pageDiv.m.activeFrame.contentDocument.body;
      Monocle.Styles.affix(bdy, "transform", "translateX("+(0-offset)+"px)");
      callback();
    }
    return p.setPageFn(pageDiv, locus, spCallback);
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


  function onLastPage() {
    // At the end of the book, both page numbers are the same. So this is
    // a way to test that we can advance one page.
    var upperPlace = getPlace(upperPage());
    var lowerPlace = getPlace(lowerPage());
    return (
      upperPlace.componentId() == lowerPlace.componentId() &&
      upperPlace.pageNumber() == lowerPlace.pageNumber()
    )
  }


  function lift(dir, boxPointX) {
    if (p.turnData.waiting || p.turnData.direction) {
      return true;
    }

    p.turnData.points = {
      start: boxPointX,
      min: boxPointX,
      max: boxPointX
    }

    if (dir == k.FORWARDS) {
      if (!onLastPage()) {
        p.turnData.direction = dir;
        // if (Monocle.Browser.has.iframeTouchBug) {
        //   lowerPage().style.display = "block";
        // }
        slideToCursor(boxPointX);
      }
      return true;
    } else if (dir == k.BACKWARDS) {
      // if (Monocle.Browser.has.iframeTouchBug) {
      //   lowerPage().style.display = "block";
      // }
      p.turnData.waiting = 'flipping lowerPage backwards';
      var place = getPlace();
      var rslt = setPage(
        lowerPage(),
        place.getLocus({ direction: dir }),
        // Callback on success
        function () {
          p.turnData.direction = dir;
          deferredCall(function() {
            jumpOut(function () {
              deferredCall(function () {
                flipPages();
                slideToCursor(boxPointX);
                p.turnData.waiting = null;
                if (p.turnData.dropped) {
                  drop(dir, boxPointX);
                }
              });
            });
          });
        },
        // Callback on failure
        function () {
          p.turnData = {};
        }
      );
      return true;
    }
    return false;
  }


  function turning(dir, boxPointX) {
    if (p.turnData.waiting || p.turnData.direction != dir) {
      return false;
    }

    p.turnData.points.min = Math.min(p.turnData.points.min, boxPointX);
    p.turnData.points.max = Math.max(p.turnData.points.max, boxPointX);

    slideToCursor(boxPointX, null, "0");

    return true;
  }


  function drop(dir, boxPointX) {
    if (p.turnData.waiting) {
      p.turnData.dropped = true;
      return false;
    }
    if (p.turnData.direction != dir) {
      return false;
    }

    slideToCursor(boxPointX, null, "0");

    p.turnData.waiting = 'animating drop';

    p.turnData.points.tap = p.turnData.points.max - p.turnData.points.min < 10;

    if (p.turnData.direction == k.FORWARDS) {
      if (
        p.turnData.points.tap ||
        p.turnData.points.start - boxPointX > 60 ||
        p.turnData.points.min >= boxPointX
      ) {
        // Completing forward turn
        slideOut(flipPages);
      } else {
        // Cancelling forward turn
        slideIn();
      }
      return true;
    } else if (p.turnData.direction == k.BACKWARDS) {
      if (
        p.turnData.points.tap ||
        boxPointX - p.turnData.points.start > 60 ||
        p.turnData.points.max <= boxPointX
      ) {
        // Completing backward turn
        slideIn();
      } else {
        // Cancelling backward turn
        slideOut(flipPages);
      }
      return true;
    }
    return false;
  }


  function completedTurn() {
    var place = getPlace();
    var resetTurn = function () {
      p.reader.dispatchEvent('monocle:turn');
      p.turnData = {};
    }

    // If successful:
    var winCallback = function () {
      jumpIn(resetTurn);
      // jumpIn(function() {
      //   resetTurn();
      //   if (Monocle.Browser.has.iframeTouchBug) {
      //     lowerPage().style.display = "none";
      //   }
      // });
    }

    // If unsuccessful, we just assume setting to current page will succeed:
    var failCallback = function () {
      setPage(lowerPage(), place.getLocus(), winCallback);
    }

    setPage(
      lowerPage(),
      place.getLocus({ direction: k.FORWARDS }),
      winCallback,
      failCallback
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
      p.turnData.srcX = sX;
      p.turnData.destX = parseInt(x);
      elem.setXTCB = function () {
        p.turnData.srcX = null;
        p.turnData.destX = null;
        if (callback) { callback(); }
      }
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
    setX(upperPage(), 0 - p.reader.properties.pageWidth, slideOpts, cb);
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
  FOLLOW_CURSOR: 150, //Monocle.Browser.is.MobileSafari ? 0 : 150,
  ANTI_FLICKER_DELAY: 0
}




Monocle.pieceLoaded('flippers/slider');
