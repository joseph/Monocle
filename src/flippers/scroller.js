Monocle.Flippers.Scroller = function (reader, setPageFn) {
  if (Monocle.Flippers == this) {
    return new Monocle.Flippers.Scroller(reader, setPageFn);
  }

  // Constants
  var k = {
    speed: 200, // How long the animation takes
    rate: 20 // frame-rate of the animation
  }


  // Properties
  var p = {
    pageCount: 1
  }

  var API = {
    constructor: Monocle.Flippers.Scroller,
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
    return p.reader.getBook().placeFor(p.page);
  }


  function moveTo(locus) {
    var spCallback = function (rslt) {
      var div = p.page.contentFrame.contentWindow.document.body;
      var jump = (rslt.offset - div.scrollLeft) / (k.speed / k.rate);
      clearTimeout(p.timer);
      p.timer = setInterval(
        function () {
          div.scrollLeft += jump;
          if (
            (jump == 0) ||
            (jump < 0 && div.scrollLeft < rslt.offset) ||
            (jump > 0 && div.scrollLeft > rslt.offset)
          ) {
            div.scrollLeft = rslt.offset;
            clearTimeout(p.timer);
            p.reader.dispatchEvent('monocle:turn');
          }

          // FIXME: a hack for webkit rendering artefacts.
          // DISABLED for speed, but means this flipper is broken on some WebKits.
          //var x = Math.random() / 1000 + 1.0;
          //div.style.webkitTransform = "scale(" + x + ")";
        },
        k.rate
      );
    }
    var rslt = p.setPageFn(p.page, locus, spCallback);
    return rslt;
  }


  function turn(boxPointX) {
    if (inForwardZone(boxPointX)) {
      moveTo({ page: getPlace().pageNumber() + 1});
    } else if (inBackwardZone(boxPointX)) {
      moveTo({ page: getPlace().pageNumber() - 1});
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
  API.visiblePages = visiblePages;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;

  initialize();

  return API;
}


Monocle.pieceLoaded('flippers/scroller');
