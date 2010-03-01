Carlyle.Flippers.Standard = function (reader) {
  if (Carlyle.Flippers == this) {
    return new Carlyle.Flippers.Standard(reader);
  }

  // Constants
  var k = {
  }


  // Properties
  var p = {
    pageCount: 2
  }

  var API = {
    constructor: Carlyle.Flippers.Standard,
    properties: p,
    constants: k
  }


  function initialize() {
  }


  function addPage(pageDiv) {
  }


  function listenForInteraction() {
    // TODO
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  //API.moveToPage = moveToPage;
  //API.moveToPercentageThrough = moveToPercentageThrough;
  API.listenForInteraction = listenForInteraction;
  //API.overrideDimensions = overrideDimensions;

  return API;
}
