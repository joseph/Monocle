Carlyle.Flippers.Instant = function (reader) {
  if (Carlyle.Flippers == this) {
    return new Carlyle.Flippers.Instant(reader);
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
  }


  function addPage(pageDiv) {
    p.page = pageDiv;
  }


  function listenForInteraction() {
    // TODO
  }



  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  API.listenForInteraction = listenForInteraction;
  //API.moveToPage = moveToPage;
  //API.moveToPercentageThrough = moveToPercentageThrough;

  initialize();

  return API;
}
