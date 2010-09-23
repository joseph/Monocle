Monocle.Dimensions.Vert = function (pageDiv) {

  var API = { constructor: Monocle.Dimensions.Vert }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    page: pageDiv,
    reader: pageDiv.m.reader
  }


  function initialize() {
    p.reader.listen('monocle:componentchange', componentChanged);
  }


  function hasChanged() {
  }


  function measure() {
  }


  function pages() {
  }


  function percentageThroughOfId(id) {
  }


  function componentChanged(evt) {
    if (evt.m['page'] != p.page) { return; }
    var sheaf = p.page.m.sheafDiv;
    var cmpt = p.page.m.activeFrame;
    sheaf.dom.setStyles(k.SHEAF_STYLES);
    cmpt.dom.setStyles(k.COMPONENT_STYLES);
    cmpt.contentDocument.documentElement.style.overflow = 'hidden';
  }


  API.hasChanged = hasChanged;
  API.measure = measure;
  API.pages = pages;
  API.percentageThroughOfId = percentageThroughOfId;

  initialize();

  return API;
}
