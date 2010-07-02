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


  /* MOVE ALL THIS TO A PAGEPANEL CONTROL */
  function listenForInteraction() {
    p.panels = {
      forwards: interactionPanel(
        k.FORWARDS,
        "right: 0; background: rgba(255,255,255,0.9); opacity: 0;" +
          "outline: 1px solid #FFF;" +
          Monocle.Styles.expand("box-shadow", "-1px 0 3px #777")
      ),
      backwards: interactionPanel(
        k.BACKWARDS,
        "left: 0; background: rgba(255,255,255,0.9); opacity: 0;" +
          "outline: 1px solid #FFF;" +
          Monocle.Styles.expand("box-shadow", "1px 0 3px #777")
      )
    }
    p.reader.addControl(p.panels.forwards);
    p.reader.addControl(p.panels.backwards);
  }


  function interactionPanel(dir, styleRules) {
    return {
      createControlElements: function (cntr) {
        var panel = this.div = document.createElement('div');
        panel.style.cssText = "position: absolute; width: 33%; height: 100%;" +
          "-webkit-transition: width ease-in 350ms, opacity linear 200ms; " +
          styleRules;
        panel.m = panel.monocleData = { 'dir': dir };
        Monocle.Events.listenForContact(panel, { start: liftFn });
        return panel;
      }
    }
  }


  function liftFn(evt) {
    var panel = evt.target || evt.srcElement;
    if (panel.monocleData.lifting) {
      endFn(evt);
      return;
    }
    panel.monocleData.lifting = true;
    panel.monocleData.defaultCSS = panel.style.cssText;
    panel.style.webkitTransition = "none";
    panel.style.width = "100%";
    panel.style.left = "0";
    panel.style.zIndex = 1001;
    panel.monocleData.liftingListeners = Monocle.Events.listenForContact(
      panel,
      {
        move: moveFn,
        end: endFn,
        cancel: endFn
      }
    );
    lift(panel.monocleData.dir, evt.monocleData.pageX);
    evt.preventDefault();
  }


  function moveFn(evt) {
    turning(evt.monocleData.pageX);
    evt.preventDefault();
  }


  function endFn(evt) {
    var panel = evt.target || evt.srcElement;
    Monocle.Events.deafenForContact(panel, panel.monocleData.liftingListeners);
    panel.style.cssText = panel.monocleData.defaultCSS;
    panel.monocleData.lifting = false;
    drop(evt.monocleData.pageX);
    evt.preventDefault();
  }


  function toggleInteractiveMode() {
    var page = visiblePages()[0];
    var sheaf = page.m.sheafDiv;
    if (p.interactive) {
      p.panels.forwards.div.style.width = "33%";
      p.panels.backwards.div.style.width = "33%";
    } else {
      var bw = sheaf.offsetLeft;
      var fw = page.offsetWidth - (sheaf.offsetLeft + sheaf.offsetWidth);
      bw -= 2;
      fw -= 2;
      bw /= page.offsetWidth;
      fw /= page.offsetWidth;
      bw = Math.floor(bw * 10000) / 100;
      fw = Math.floor(fw * 10000) / 100;
      bw += "%";
      fw += "%";
      p.panels.forwards.div.style.width = fw;
      p.panels.backwards.div.style.width = bw;
    }
    p.interactive = !p.interactive;

    p.panels.forwards.div.style.opacity = 1;
    p.panels.backwards.div.style.opacity = 1;
    setTimeout(function () {
      p.panels.forwards.div.style.opacity = 0;
      p.panels.backwards.div.style.opacity = 0;
    }, 500);

  }
  /* END page panel */


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


  function liftAnimationFinished(boxPointX) {
    p.turnData.animating = false;
    turning(boxPointX);
    if (p.turnData.dropped) {
      drop(boxPointX);
      p.turnData.dropped -= 1;
    }
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
    if (p.turnData.animating || p.turnData.direction) {
      return true;
    }

    p.turnData.points = {
      start: boxPointX,
      min: boxPointX,
      max: boxPointX
    }

    if (dir == k.FORWARDS) {
      if (!onLastPage()) {
        p.turnData.animating = true;
        p.turnData.direction = dir;
        // if (Monocle.Browser.has.iframeTouchBug) {
        //   lowerPage().style.display = "block";
        // }
        slideToCursor(
          boxPointX,
          function () {
            liftAnimationFinished(boxPointX);
          }
        );
      }
      return true;
    } else if (dir == k.BACKWARDS) {
      // if (Monocle.Browser.has.iframeTouchBug) {
      //   lowerPage().style.display = "block";
      // }
      var place = getPlace();
      var rslt = setPage(
        lowerPage(),
        place.getLocus({ direction: dir }),
        // Callback on success
        function () {
          p.turnData.animating = true;
          p.turnData.direction = dir;
          deferredCall(function() {
            jumpOut(function () {
              deferredCall(function () {
                flipPages();
                slideToCursor(boxPointX);
                liftAnimationFinished(boxPointX);
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


  function turning(boxPointX) {
    if (p.turnData.animating || !p.turnData.direction) {
      return false;
    }

    p.turnData.points.min = Math.min(p.turnData.points.min, boxPointX);
    p.turnData.points.max = Math.max(p.turnData.points.max, boxPointX);

    slideToCursor(boxPointX, null, "0");

    return true;
  }


  function drop(boxPointX) {
    if (p.turnData.animating) {
      p.turnData.dropped = true;
      return true;
    }
    if (!p.turnData.direction) {
      return false;
    }

    p.turnData.animating = true;

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
  API.toggleInteractiveMode = toggleInteractiveMode;

  initialize();

  return API;
}

// Constants
Monocle.Flippers.Slider.TURN_PANELS = Monocle.Controls.TurnPanels;
Monocle.Flippers.Slider.FORWARDS = 1;
Monocle.Flippers.Slider.BACKWARDS = -1;
Monocle.Flippers.Slider.durations = {
  SLIDE: 200,
  FOLLOW_CURSOR: 100,
  ANTI_FLICKER_DELAY: 0
}




Monocle.pieceLoaded('flippers/slider');
