Monocle.Flippers.Instant = function (reader) {

  var API = { constructor: Monocle.Flippers.Instant }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 1
  }


  function initialize() {
    p.reader = reader;
  }


  function addPage(pageDiv) {
    pageDiv.m.dimensions = new Monocle.Dimensions.Columns(pageDiv);
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


  function listenForInteraction(panelClass) {
    if (typeof panelClass != "function") {
      if (Monocle.Browser.on.Kindle3) {
        panelClass = Monocle.Panels.eInk;
      }
      panelClass = panelClass || k.DEFAULT_PANELS_CLASS;
    }
    if (!panelClass) { throw("Panels not found."); }
    p.panels = new panelClass(API, { 'end': turn });
  }


  function page() {
    return p.reader.dom.find('page');
  }


  function turn(panel) {
    var dir = panel.properties.direction;
    moveTo({ page: getPlace().pageNumber() + dir});
  }


  function frameToLocus(locus) {
    page().m.dimensions.translateToLocus(locus);
    Monocle.defer(function () { p.reader.dispatchEvent('monocle:turn'); });
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

Monocle.Flippers.Instant.FORWARDS = 1;
Monocle.Flippers.Instant.BACKWARDS = -1;
Monocle.Flippers.Instant.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;



Monocle.pieceLoaded('flippers/instant');
