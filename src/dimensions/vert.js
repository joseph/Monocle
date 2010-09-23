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
    return getBodyHeight() != p.bodyHeight || getPageHeight != p.pageHeight;
  }


  function measure() {
    p.bodyHeight = getBodyHeight();
    p.pageHeight = getPageHeight();
    p.length = Math.ceil(p.bodyHeight / p.pageHeight);
    return p.length;
  }


  function pages() {
    return p.length;
  }


  function getBodyHeight() {
    return p.page.m.activeFrame.contentDocument.body.scrollHeight;
  }


  function getPageHeight() {
    return p.page.m.activeFrame.offsetHeight - k.GUTTER;
  }


  function percentageThroughOfId(id) {
    // TODO
  }


  function componentChanged(evt) {
    if (evt.m['page'] != p.page) { return; }
    var sheaf = p.page.m.sheafDiv;
    var cmpt = p.page.m.activeFrame;
    sheaf.dom.setStyles(k.SHEAF_STYLES);
    cmpt.dom.setStyles(k.COMPONENT_STYLES);
    var doc = evt.m['document'];
    doc.documentElement.style.overflow = 'hidden';
    doc.body.style.marginRight = '10px !important';
    cmpt.contentWindow.scrollTo(0,0);
  }


  function locusToOffset(locus) {
    return p.pageHeight * (locus.page - 1);
  }


  API.hasChanged = hasChanged;
  API.measure = measure;
  API.pages = pages;
  API.percentageThroughOfId = percentageThroughOfId;
  API.locusToOffset = locusToOffset;

  initialize();

  return API;
}

Monocle.Dimensions.Vert.GUTTER = 10;
