Monocle.Dimensions.Columns = function (pageDiv) {

  var API = { constructor: Monocle.Dimensions.Columns }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    page: pageDiv,
    reader: pageDiv.m.reader,
    length: 0
  }


  function initialize() {
    p.reader.listen('monocle:componentchange', componentChanged);
  }


  function hasChanged() {
    return p.page.m.activeFrame.m.component.getSize() ? false : true;
  }


  function measure() {
    p.length = Math.ceil(columnedDimensions().width / pageDimensions().width);

    console.log(
      'page['+p.page.m.pageIndex+'] -> '+p.length+
      ' ('+p.page.m.activeFrame.m.component.properties.id+')'
    );

    return p.length;
  }


  function pages() {
    if (hasChanged()) {
      console.warn('Accessing pages() when dimensions are dirty.')
      return 0;
    }
    return p.length;
  }


  // FIXME: I guess we've busted this.
  //
  function percentageThroughOfNode(target) {
    // if (!target) {
    //   return 0;
    // }
    // var doc = p.page.m.activeFrame.contentDocument;
    // var offset = 0;
    // if (target.getBoundingClientRect) {
    //   offset = target.getBoundingClientRect().left;
    //   offset -= doc.body.getBoundingClientRect().left;
    // } else {
    //   var scroller = columnedElement();
    //   var oldScrollLeft = scroller.scrollLeft;
    //   target.scrollIntoView();
    //   offset = scroller.scrollLeft;
    //   scroller.scrollTop = 0;
    //   scroller.scrollLeft = oldScrollLeft;
    // }
    //
    // var percent = offset / columnedDimensions().width;
    // return percent;

    return 0;
  }


  function componentChanged(evt) {
    if (evt.m['page'] != p.page) { return; }
    setColumnWidth();
  }


  function setColumnWidth() {
    var pdims = pageDimensions();
    var ce = columnedElement();

    ce.style.cssText = Monocle.Styles.applyRules(null, k.STYLE["columned"]);

    Monocle.Styles.affix(ce, 'column-width', pdims.width+'px');

    if (ce.scrollHeight > pdims.height) {
      console.warn("Forcing columns...");
      Monocle.Styles.applyRules(ce, k.STYLE["column-force"]);
    }
  }


  // Returns the element to which columns CSS should be applied.
  //
  function columnedElement() {
    return p.page.m.activeFrame.contentDocument.body;
  }


  // Returns the dimensions of the offsettable area of the columned element. By
  // definition, the number of pages is always the width of this divided by the
  // width of a single page (eg, the client area of the columned element).
  //
  function columnedDimensions() {
    var elem = columnedElement();
    var cmpt = p.page.m.activeFrame.m.component;
    var de = p.page.m.activeFrame.contentDocument.documentElement;
    var size = cmpt.getSize();
    if (!size) {
      size = { width: de.scrollWidth, height: de.scrollHeight }
      if (size.width <= pageDimensions().width) {
        size = { width: elem.scrollWidth, height: elem.scrollHeight }
      }
      //console.log("width: "+size.width+", height: "+size.height);
      cmpt.setSize(size);
    }
    return size;
  }


  function pageDimensions() {
    var elem = p.page.m.sheafDiv;
    return { width: elem.clientWidth, height: elem.clientHeight }
  }


  function locusToOffset(locus) {
    return pageDimensions().width * (locus.page - 1);
  }


  function translateToLocus(locus) {
    var offset = locusToOffset(locus);
    p.page.m.offset = offset;
    var ce = columnedElement();
    if (Monocle.Browser.iOSVersion >= 5) {
      ce.style.cssText += "-webkit-transform: translate3d(-"+offset+"px,0,0)";
    } else {
      Monocle.Styles.affix(ce, "transform", "translateX(-"+offset+"px)");
    }
    return offset;
  }


  API.hasChanged = hasChanged;
  API.measure = measure;
  API.pages = pages;
  API.percentageThroughOfNode = percentageThroughOfNode;

  API.locusToOffset = locusToOffset;
  API.translateToLocus = translateToLocus;

  initialize();

  return API;
}


Monocle.Dimensions.Columns.STYLE = {
  "columned": {
    "margin": "0",
    "padding": "0",
    "height": "100%",
    "width": "100%",
    "position": "absolute",
    "-webkit-column-gap": "0",
    "-moz-column-gap": "0",
    "-o-column-gap": "0",
    "column-gap": "0"
  },
  "column-force": {
    "min-width": "200%",
    "overflow": "hidden"
  }
}


Monocle.pieceLoaded("dimensions/columns");
