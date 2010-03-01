Carlyle.Flippers.Legacy = function (reader) {
  if (Carlyle.Flippers == this) {
    return new Carlyle.Flippers.Legacy(reader);
  }

  // Constants
  var k = {
  }


  // Properties
  var p = {
    pageCount: 1
  }

  var API = {
    constructor: Carlyle.Flippers.Legacy,
    properties: p,
    constants: k
  }


  function initialize() {
  }


  function addPage(pageDiv) {
    p.page = pageDiv;
  }


  function overrideDimensions() {
    var nextLink = document.createElement('a');
    nextLink.innerHTML = "Next part...";
    nextLink.onclick = function () { console.log("Not yet implemented..."); }
    p.page.scrollerDiv.appendChild(nextLink);
    p.page.scrollerDiv.style.right = "0";
    p.page.scrollerDiv.style.overflow = "auto";
    p.page.contentDiv.style.position = "relative";
    p.page.contentDiv.style.width = "100%";
    p.page.contentDiv.style.minWidth = "100%";
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
  API.overrideDimensions = overrideDimensions;

  initialize();

  return API;
}
