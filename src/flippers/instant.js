Monocle.Flippers.Instant = function (reader, setPageFn) {
  if (Monocle.Flippers == this) {
    return new Monocle.Flippers.Instant(reader, setPageFn);
  }

  // Constants
  var k = {
  }


  // Properties
  var p = {
    pageCount: 1
  }

  var API = {
    constructor: Monocle.Flippers.Instant,
    properties: p,
    constants: k
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


  function listenForInteraction() {
    p.reader.addListener(
      "monocle:contact:start",
      function (evt) {
        if (turn(evt.monocleData.contactX)) {
          evt.preventDefault();
        }
      }
    );
  }


  function getPlace() {
    return p.page.m.place;
  }


  function moveTo(locus) {
    var spCallback = function (offset) {
      var div = p.page.m.activeFrame.contentDocument.body;
      div.scrollLeft = offset;
      if (div.scrollLeft == 0) {
        p.page.sheafDiv.scrollLeft = offset;
      }
      // FIXME: hacks for webkit rendering artefacts.
      div.style.left = "0px";
      var x = Math.random() / 1000 + 1.0;
      div.style.webkitTransform = "scale(" + x + ")";
    }
    p.setPageFn(p.page, locus, spCallback);
  }


  function turn(boxPointX) {
    if (inForwardZone(boxPointX)) {
      moveTo({ page: getPlace().pageNumber() + 1});
      return true;
    } else if (inBackwardZone(boxPointX)) {
      moveTo({ page: getPlace().pageNumber() - 1});
      return true;
    }
    return false;
  }


  // Returns to if the box-based x point is in the "Go forward" zone for
  // user turning a page.
  //
  function inForwardZone(x) {
    return x > p.reader.properties.pageWidth * 0.6;
  }


  // Returns to if the box-based x point is in the "Go backward" zone for
  // user turning a page.
  //
  function inBackwardZone(x) {
    return x < p.reader.properties.pageWidth * 0.4;
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


Monocle.pieceLoaded('flippers/instant');
