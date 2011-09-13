Monocle.Flippers.Scroller = function (reader, setPageFn) {

  var API = { constructor: Monocle.Flippers.Scroller }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 1,
    duration: 200
  }


  function initialize() {
    p.reader = reader;
    p.setPageFn = setPageFn;
  }


  function addPage(pageDiv) {
    pageDiv.m.dimensions = new Monocle.Dimensions.Columns(pageDiv);
  }


  function page() {
    return p.reader.dom.find('page');
  }


  function listenForInteraction(panelClass) {
    if (typeof panelClass != "function") {
      panelClass = k.DEFAULT_PANELS_CLASS;
    }
    p.panels = new panelClass(
      API,
      {
        'end': function (panel) { turn(panel.properties.direction); }
      }
    );
  }


  function turn(dir) {
    if (p.turning) { return; }
    moveTo({ page: getPlace().pageNumber() + dir});
  }


  function getPlace() {
    return page().m.place;
  }


  function moveTo(locus, callback) {
    var fn = frameToLocus;
    if (typeof callback == "function") {
      fn = function (locus) { frameToLocus(locus); callback(locus); }
    }
    p.reader.getBook().setOrLoadPageAt(page(), locus, fn);
  }


  function frameToLocus(locus) {
    p.turning = true;

    var x = page().m.dimensions.locusToOffset(locus);
    var bdy = page().m.activeFrame.contentDocument.body;
    if (false && typeof WebKitTransitionEvent != "undefined") {
      bdy.style.webkitTransition = "-webkit-transform " +
        p.duration + "ms ease-out 0ms";
      bdy.style.webkitTransform = "translateX(-"+x+"px)";
      Monocle.Events.listen(
        bdy,
        'webkitTransitionEnd',
        function () {
          p.turning = false;
          p.reader.dispatchEvent('monocle:turn');
        }
      );
    } else {
      var finalX = 0 - x;
      var stamp = (new Date()).getTime();
      var frameRate = 40;
      var currX = p.currX || 0;
      var step = (finalX - currX) * (frameRate / p.duration);
      var stepFn = function () {
        var destX = currX + step;
        if (
          (new Date()).getTime() - stamp > p.duration ||
          Math.abs(currX - finalX) <= Math.abs((currX + step) - finalX)
        ) {
          clearTimeout(bdy.animInterval)
          Monocle.Styles.setX(bdy, finalX);
          p.turning = false;
          p.reader.dispatchEvent('monocle:turn');
        } else {
          Monocle.Styles.setX(bdy, destX);
          currX = destX;
        }
        p.currX = destX;
      }
      bdy.animInterval = setInterval(stepFn, frameRate);
    }
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;

  initialize();

  return API;
}

Monocle.Flippers.Scroller.speed = 200; // How long the animation takes
Monocle.Flippers.Scroller.rate = 20; // frame-rate of the animation
Monocle.Flippers.Scroller.FORWARDS = 1;
Monocle.Flippers.Scroller.BACKWARDS = -1;
Monocle.Flippers.Scroller.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;


Monocle.pieceLoaded('flippers/scroller');
