Monocle.Flippers.Slider = function (reader) {

  var API = { constructor: Monocle.Flippers.Slider }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    pageCount: 2,
    activeIndex: 1,
    turnData: {},
    nextPageReady: true
  }


  function initialize() {
    p.reader.listen("monocle:componentchanging", showWaitControl);
  }


  function addPage(pageDiv) {
    pageDiv.m.dimensions = new Monocle.Dimensions.Columns(pageDiv);

    // BROWSERHACK: Firefox 4 is prone to beachballing on the first page turn
    // unless a zeroed translateX has been applied to the page div.
    Monocle.Styles.setX(pageDiv, 0);
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
    p.panels = new panelClass(
      API,
      {
        'start': lift,
        'move': turning,
        'end': release,
        'cancel': release
      }
    );
  }


  function getPlace(pageDiv) {
    pageDiv = pageDiv || upperPage();
    return pageDiv.m ? pageDiv.m.place : null;
  }


  function moveTo(locus, callback) {
    var cb = function () {
      if (typeof callback == "function") { callback(); }
      announceTurn();
    }
    setPage(upperPage(), locus, function () { prepareNextPage(cb) });
  }


  function setPage(pageDiv, locus, onLoad, onFail) {
    p.reader.getBook().setOrLoadPageAt(
      pageDiv,
      locus,
      function (locus) {
        pageDiv.m.dimensions.translateToLocus(locus);
        Monocle.defer(onLoad);
      },
      onFail
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

    p.reader.selection.deselect();

    p.turnData.points = {
      start: boxPointX,
      min: boxPointX,
      max: boxPointX
    }
    p.turnData.lifting = true;

    var place = getPlace();

    if (dir == k.FORWARDS) {
      if (place.onLastPageOfBook()) {
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
      if (place.onFirstPageOfBook()) {
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
    if (p.nextPageReady === false) {
      prepareNextPage(function () { lifted(x); }, resetTurnData);
    } else {
      lifted(x);
    }
  }


  function onGoingBackward(x) {
    var lp = lowerPage(), up = upperPage();
    var onFail = function () { slideOut(afterCancellingBackward); }

    if (Monocle.Browser.env.offscreenRenderingClipped) {
      // set lower to "the page before upper"
      setPage(
        lp,
        getPlace(up).getLocus({ direction: k.BACKWARDS }),
        function () {
          // flip lower to upper, ready to slide in from left
          flipPages();
          // move lower off the screen to the left
          jumpOut(lp, function () { lifted(x); });
        },
        onFail
      );
    } else {
      jumpOut(lp, function () {
        flipPages();
        setPage(
          lp,
          getPlace(up).getLocus({ direction: k.BACKWARDS }),
          function () { lifted(x); },
          onFail
        );
      });
    }
  }


  function afterGoingForward() {
    var up = upperPage(), lp = lowerPage();
    flipPages();
    jumpIn(up, function () { prepareNextPage(announceTurn); });
  }


  function afterGoingBackward() {
    announceTurn();
  }


  function afterCancellingForward() {
    announceCancel();
  }


  function afterCancellingBackward() {
    flipPages(); // flip upper to lower
    jumpIn(lowerPage(), function () { prepareNextPage(announceCancel); });
  }


  // Prepares the lower page to show the next page after the current page,
  // and calls onLoad when done.
  //
  // Note that if the next page is a new component, and it fails to load,
  // onFail will be called. If onFail is not supplied, onLoad will be called.
  //
  function prepareNextPage(onLoad, onFail) {
    setPage(
      lowerPage(),
      getPlace().getLocus({ direction: k.FORWARDS }),
      onLoad,
      function () {
        onFail ? onFail() : onLoad();
        p.nextPageReady = false;
      }
    );
  }


  function lifted(x) {
    p.turnData.lifting = false;
    p.reader.dispatchEvent('monocle:turning');
    var releaseArgs = p.turnData.releaseArgs;
    if (releaseArgs) {
      p.turnData.releaseArgs = null;
      release(releaseArgs[0], releaseArgs[1]);
    } else if (x) {
      slideToCursor(x);
    }
  }


  function announceTurn() {
    p.nextPageReady = true;
    p.reader.dispatchEvent('monocle:turn');
    resetTurnData();
  }


  function announceCancel() {
    p.reader.dispatchEvent('monocle:turn:cancel');
    resetTurnData();
  }


  function resetTurnData() {
    hideWaitControl();
    p.turnData = {};
  }


  function setX(elem, x, options, callback) {
    var duration, transition;

    if (!options.duration) {
      duration = 0;
    } else {
      duration = parseInt(options.duration, 10);
    }

    if (Monocle.Browser.env.supportsTransition) {
      Monocle.Styles.transitionFor(
        elem,
        'transform',
        duration,
        options.timing,
        options.delay
      );

      if (Monocle.Browser.env.supportsTransform3d) {
        Monocle.Styles.affix(elem, 'transform', 'translate3d('+x+'px,0,0)');
      } else {
        Monocle.Styles.affix(elem, 'transform', 'translateX('+x+'px)');
      }

      if (typeof callback == "function") {
        if (duration && Monocle.Styles.getX(elem) != x) {
          Monocle.Events.afterTransition(elem, callback);
        } else {
          Monocle.defer(callback);
        }
      }
    } else {
      // Old-school JS animation.
      elem.currX = elem.currX || 0;
      var completeTransition = function () {
        elem.currX = x;
        Monocle.Styles.setX(elem, x);
        if (typeof callback == "function") { callback(); }
      }
      if (!duration) {
        completeTransition();
      } else {
        var stamp = (new Date()).getTime();
        var frameRate = 40;
        var step = (x - elem.currX) * (frameRate / duration);
        var stepFn = function () {
          var destX = elem.currX + step;
          var timeElapsed = ((new Date()).getTime() - stamp) >= duration;
          var pastDest = (destX > x && elem.currX < x) ||
            (destX < x && elem.currX > x);
          if (timeElapsed || pastDest) {
            completeTransition();
          } else {
            Monocle.Styles.setX(elem, destX);
            elem.currX = destX;
            setTimeout(stepFn, frameRate);
          }
        }
        stepFn();
      }
    }
  }


  function jumpIn(pageDiv, callback) {
    var opts = { duration: (Monocle.Browser.env.stickySlideOut ? 1 : 0) }
    setX(pageDiv, 0, opts, callback);
  }


  function jumpOut(pageDiv, callback) {
    setX(pageDiv, 0 - pageDiv.offsetWidth, { duration: 0 }, callback);
  }


  // NB: Slides are always done by the visible upper page.

  function slideIn(callback) {
    setX(upperPage(), 0, slideOpts(), callback);
  }


  function slideOut(callback) {
    setX(upperPage(), 0 - upperPage().offsetWidth, slideOpts(), callback);
  }


  function slideToCursor(cursorX, callback, duration) {
    setX(
      upperPage(),
      Math.min(0, cursorX - upperPage().offsetWidth),
      { duration: duration || k.FOLLOW_DURATION },
      callback
    );
  }


  function slideOpts() {
    var opts = { timing: 'ease-in', duration: 320 }
    var now = (new Date()).getTime();
    if (p.lastSlide && now - p.lastSlide < 1500) { opts.duration *= 0.5; }
    p.lastSlide = now;
    return opts;
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


  function showWaitControl() {
    ensureWaitControl();
    p.reader.dom.find('flippers_slider_wait', 0).style.opacity = 1;
    p.reader.dom.find('flippers_slider_wait', 1).style.opacity = 1;
  }


  function hideWaitControl() {
    ensureWaitControl();
    p.reader.dom.find('flippers_slider_wait', 0).style.opacity = 0;
    p.reader.dom.find('flippers_slider_wait', 1).style.opacity = 0;
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;

  // OPTIONAL API - WILL BE INVOKED (WHERE RELEVANT) IF PROVIDED.
  API.visiblePages = visiblePages;

  initialize();

  return API;
}


// Constants
Monocle.Flippers.Slider.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;
Monocle.Flippers.Slider.FORWARDS = 1;
Monocle.Flippers.Slider.BACKWARDS = -1;
Monocle.Flippers.Slider.FOLLOW_DURATION = 100;
