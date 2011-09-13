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


  function percentageThroughOfNode(target) {
    if (!target) { return 0; }
    var doc = p.page.m.activeFrame.contentDocument;
    var offset = 0;
    if (Monocle.Browser.env.findNodesByScrolling) {
      // TODO: remove translation
      var win = s = p.page.m.activeFrame.contentWindow;
      var scrollers = [
        [win, win.scrollX, win.scrollY],
        [window, window.scrollX, window.scrollY]
      ];
      //while (s != s.parent) { scrollers.push([s, s.scrollX]); s = s.parent; }

      if (Monocle.Browser.env.sheafIsScroller) {
        var scroller = p.page.m.sheafDiv;
        var x = scroller.scrollLeft;
        target.scrollIntoView();
        offset = scroller.scrollLeft;
      } else {
        var scroller = win;
        var x = scroller.scrollX;
        target.scrollIntoView();
        offset = scroller.scrollX;
      }

      while (s = scrollers.shift()) {
        s[0].scrollTo(s[1], s[2]);
      }
      // TODO: replace translation
    } else {
      offset = target.getBoundingClientRect().left;
      offset -= doc.body.getBoundingClientRect().left;
    }

    // We know at least 1px will be visible, and offset should not be 0.
    offset += 1;

    // Percent is the offset divided by the total width of the component.
    var percent = offset / columnedDimensions().width;

    // Page number would be offset divided by the width of a single page.
    // var pageNum = Math.ceil(offset / pageDimensions().width);

    return percent;
  }


  function componentChanged(evt) {
    if (evt.m['page'] != p.page) { return; }
    setColumnWidth();
  }


  function setColumnWidth() {
    var pdims = pageDimensions();
    var ce = columnedElement();

    // FIXME: Apply as a single string. Dynamically generate gap rule.
    ce.style.cssText = Monocle.Styles.applyRules(null, k.STYLE["columned"]);
    Monocle.Styles.affix(ce, 'column-width', pdims.width+'px');

    if (Monocle.Browser.env.forceColumns) {
      Monocle.defer(function () {
        if (ce.scrollHeight > pdims.height) {
          console.warn("Force columns ("+ce.scrollHeight+" > "+pdims.height+")");
          Monocle.Styles.applyRules(ce, k.STYLE["column-force"]);
        }
      });
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
    var cmpt = p.page.m.activeFrame.m.component;
    var bd = columnedElement();
    var de = p.page.m.activeFrame.contentDocument.documentElement;
    var size = cmpt.getSize();
    if (!size) {
      size = { width: bd.scrollWidth, height: bd.scrollHeight }
      if (size.width < de.scrollWidth) {
        size = { width: de.scrollWidth, height: de.scrollHeight }
      }

      if (Monocle.Browser.env.widthsIgnoreTranslate && p.page.m.offset) {
        //console.log(size.width + " -> " + (size.width + p.page.m.offset));
        size.width += p.page.m.offset;
      }
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
    //if (Monocle.Browser.iOSVersion >= 5) {
    if (Monocle.Browser.env.translateIframeIn3d) {
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
