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
    p.page = pageDiv;
  }


  function visiblePages() {
    return [p.page];
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


  function getPlace() {
    return p.page.m.place;
  }


  function moveTo(locus) {
    /*
    var spCallback = function (offset) {
      if (offset == 'disallow') {
        return;
      }
      var bdy = p.page.m.activeFrame.contentDocument.body;
      bdy.style.webkitTransform =
        bdy.style.MozTransform =
          bdy.style.transform =
            "translateX(" + (0-offset) + "px)";
    }
    p.setPageFn(p.page, locus, spCallback);
    */

    var spCallback = function (offset) {
      if (offset == 'disallow') {
        return;
      }
      var bdy = p.page.m.activeFrame.contentDocument.body;
      if (typeof WebKitTransitionEvent != "undefined") {
        bdy.style.webkitTransition = "-webkit-transform " +
          p.duration + "ms ease-out 0ms";
        bdy.style.webkitTransform = "translateX("+(0-offset)+"px)";
        Monocle.Events.listen(
          bdy,
          'webkitTransitionEnd',
          function () {
            p.reader.dispatchEvent('monocle:turn');
          }
        );
      } else {
        var finalX = (0 - offset);
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
    var rslt = p.setPageFn(p.page, locus, spCallback);
    return rslt;
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

Monocle.Flippers.Scroller.speed = 200; // How long the animation takes
Monocle.Flippers.Scroller.rate = 20; // frame-rate of the animation
Monocle.Flippers.Scroller.FORWARDS = 1;
Monocle.Flippers.Scroller.BACKWARDS = -1;
Monocle.Flippers.Scroller.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;




Monocle.pieceLoaded('flippers/scroller');
