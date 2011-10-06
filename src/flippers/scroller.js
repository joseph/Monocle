Monocle.Flippers.Scroller = function (reader, setPageFn) {

  var API = { constructor: Monocle.Flippers.Scroller }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 1,
    duration: 300
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
    if (locus.boundarystart || locus.boundaryend) { return; }
    p.turning = true;
    var dims = page().m.dimensions;
    var fr = page().m.activeFrame;
    var bdy = fr.contentDocument.body;
    var anim = true;
    if (p.activeComponent != fr.m.component) {
      // No animation.
      p.activeComponent = fr.m.component;
      dims.translateToLocus(locus, "none");
      Monocle.defer(turned);
    } else if (Monocle.Browser.env.supportsTransition) {
      // Native animation.
      dims.translateToLocus(locus, p.duration+"ms ease-in 0ms");
      Monocle.Events.afterTransition(bdy, turned);
    } else {
      // Old-school JS animation.
      var x = dims.locusToOffset(locus);
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
          Monocle.Styles.setX(bdy, finalX);
          turned();
        } else {
          Monocle.Styles.setX(bdy, destX);
          currX = destX;
          setTimeout(stepFn, frameRate);
        }
        p.currX = destX;
      }
      stepFn();
    }
  }


  function turned() {
    p.turning = false;
    p.reader.dispatchEvent('monocle:turn');
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
