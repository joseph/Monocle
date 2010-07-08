Monocle.Flippers.Instant = function (reader, setPageFn) {

  var API = { constructor: Monocle.Flippers.Instant }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 1
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
    return p.setPageFn(p.page, locus, spCallback);
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

Monocle.Flippers.Instant.FORWARDS = 1;
Monocle.Flippers.Instant.BACKWARDS = -1;
Monocle.Flippers.Instant.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;



Monocle.pieceLoaded('flippers/instant');
