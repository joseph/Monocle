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
    moveTo({ page: getPlace().pageNumber() + dir});
  }


  function page() {
    return p.reader.dom.find('page');
  }

  function getPlace() {
    return page().m.place;
  }


  function moveTo(locus) {
    p.reader.getBook().setOrLoadPageAt(page(), locus, frameToLocus);
  }


  function frameToLocus(locus) {
    var mult = locus.page - 1;
    var pw = page().m.sheafDiv.clientWidth;
    var x = 0 - pw * mult;

    var bdy = page().m.activeFrame.contentDocument.body;
    if (typeof WebKitTransitionEvent != "undefined") {
      bdy.style.webkitTransition = "-webkit-transform " +
        p.duration + "ms ease-out 0ms";
      bdy.style.webkitTransform = "translateX("+x+"px)";
      Monocle.Events.listen(
        bdy,
        'webkitTransitionEnd',
        function () {
          p.reader.dispatchEvent('monocle:turn');
        }
      );
    } else {
      var finalX = x;
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
          bdy.style.MozTransform = "translateX(" + finalX + "px)";
          p.reader.dispatchEvent('monocle:turn');
        } else {
          bdy.style.MozTransform = "translateX(" + destX + "px)";
          currX = destX;
        }
        p.currX = destX;
      }
      bdy.animInterval = setInterval(stepFn, frameRate);
    }
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
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
