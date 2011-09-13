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


  function update(callback) {
    p.bodyHeight = getBodyHeight();
    p.pageHeight = getPageHeight();
    p.length = Math.ceil(p.bodyHeight / p.pageHeight);
    callback(p.length);
  }


  function getBodyHeight() {
    return p.page.m.activeFrame.contentDocument.body.scrollHeight;
  }


  function getPageHeight() {
    return p.page.m.activeFrame.offsetHeight - k.GUTTER;
  }


  function percentageThroughOfNode(target) {
    if (!target) {
      return 0;
    }
    var doc = p.page.m.activeFrame.contentDocument;
    var offset = 0;
    if (target.getBoundingClientRect) {
      offset = target.getBoundingClientRect().top;
      offset -= doc.body.getBoundingClientRect().top;
    } else {
      var oldScrollTop = doc.body.scrollTop;
      target.scrollIntoView();
      offset = doc.body.scrollTop;
      doc.body.scrollLeft = 0;
      doc.body.scrollTop = oldScrollTop;
    }

    //console.log(id + ": " + offset + " of " + p.bodyHeight);
    var percent = offset / p.bodyHeight;
    return percent;
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


  API.update = update;
  API.percentageThroughOfNode = percentageThroughOfNode;
  API.locusToOffset = locusToOffset;

  initialize();

  return API;
}

Monocle.Dimensions.Vert.GUTTER = 10;

Monocle.pieceLoaded("dimensions/vert");
