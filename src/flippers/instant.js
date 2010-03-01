Carlyle.Flippers.Instant = function (reader, setPageFn) {
  if (Carlyle.Flippers == this) {
    return new Carlyle.Flippers.Instant(reader, setPageFn);
  }

  // Constants
  var k = {
  }


  // Properties
  var p = {
    pageCount: 1
  }

  var API = {
    constructor: Carlyle.Flippers.Instant,
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


  function listenForInteraction() {
    p.reader.addEventListener(
      "carlyle:contact:start",
      function (evt) {
        if (turn(evt.carlyleData.contactX)) {
          evt.preventDefault();
        }
      }
    );
  }


  function getPlace() {
    return p.reader.getBook().placeFor(p.page.contentDiv);
  }


  function setPlace(place) {
    // FIXME! Place should never be null.
    if (place) {
      return p.setPageFn(p.page, place.pageNumber(), place.componentId());
    } else {
      return p.setPageFn(p.page, 1);
    }
  }


  function turn(boxPointX) {
    var spCallback = function (offset) {
      p.page.scrollerDiv.scrollLeft = offset;
      // FIXME: a stupid hack for webkit rendering artefacts.
      var x = Math.random() / 1000 + 1.0;
      p.page.scrollerDiv.style.webkitTransform = "scale(" + x + ")";
    }
    if (inForwardZone(boxPointX)) {
      return p.setPageFn(p.page, getPlace().pageNumber() + 1, null, spCallback);
    } else if (inBackwardZone(boxPointX)) {
      return p.setPageFn(p.page, getPlace().pageNumber() - 1, null, spCallback);
    }
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
  API.getPlace = getPlace;
  API.setPlace = setPlace;
  API.listenForInteraction = listenForInteraction;

  initialize();

  return API;
}
