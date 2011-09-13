Monocle.Dimensions.Columns = function (pageDiv) {

  var API = { constructor: Monocle.Dimensions.Columns }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    page: pageDiv,
    reader: pageDiv.m.reader,
    length: 0,
    width: 0
  }


  function update(callback) {
    setColumnWidth();
    Monocle.defer(function () {
      p.length = columnCount();
      if (Monocle.DEBUG) {
        console.log(
          'page['+p.page.m.pageIndex+'] -> '+p.length+
          ' ('+p.page.m.activeFrame.m.component.properties.id+')'
        );
      }
      callback(p.length);
    });
  }


  function setColumnWidth() {
    var pdims = pageDimensions();
    var ce = columnedElement();

    p.width = pdims.width;

    var rules = Monocle.Styles.rulesToString(k.STYLE["columned"]);
    rules += Monocle.Browser.css.toCSSDeclaration('column-width', p.width+'px');
    rules += Monocle.Browser.css.toCSSDeclaration('column-gap', 0);
    rules += Monocle.Browser.css.toCSSDeclaration('transform', "translateX(0)");

    if (Monocle.Browser.env.forceColumns && ce.scrollHeight > pdims.height) {
      rules += Monocle.Styles.rulesToString(k.STYLE['column-force']);
      if (Monocle.DEBUG) {
        console.warn("Force columns ("+ce.scrollHeight+" > "+pdims.height+")");
      }
    }

    if (ce.style.cssText != rules) {
      // Update offset because we're translating to zero.
      p.page.m.offset = 0;

      // Apply body style changes.
      ce.style.cssText = rules;

      if (Monocle.Browser.env.scrollToApplyStyle) {
        ce.scrollLeft = 0;
      }
    }
  }


  // Returns the element to which columns CSS should be applied.
  //
  function columnedElement() {
    return p.page.m.activeFrame.contentDocument.body;
  }


  // Returns the width of the offsettable area of the columned element. By
  // definition, the number of pages is always this divided by the
  // width of a single page (eg, the client area of the columned element).
  //
  function columnedWidth() {
    var bd = columnedElement();
    var de = p.page.m.activeFrame.contentDocument.documentElement;

    var w = Math.max(bd.scrollWidth, de.scrollWidth);

    if (!Monocle.Browser.env.widthsIgnoreTranslate && p.page.m.offset) {
      w += p.page.m.offset;
    }
    return w;
  }


  function pageDimensions() {
    var elem = p.page.m.sheafDiv;
    return { width: elem.clientWidth, height: elem.clientHeight }
  }


  function columnCount() {
    return Math.ceil(columnedWidth() / pageDimensions().width)
  }


  function locusToOffset(locus) {
    return pageDimensions().width * (locus.page - 1);
  }


  function translateToLocus(locus) {
    var offset = locusToOffset(locus);
    p.page.m.offset = offset;
    translateToOffset(offset);
    return offset;
  }


  function translateToOffset(offset) {
    var ce = columnedElement();
    if (Monocle.Browser.env.translateIframeIn3d) {
      ce.style.cssText += "-webkit-transform: translate3d(-"+offset+"px,0,0)";
    } else {
      Monocle.Styles.affix(ce, "transform", "translateX(-"+offset+"px)");
    }
  }


  function percentageThroughOfNode(target) {
    if (!target) { return 0; }
    var doc = p.page.m.activeFrame.contentDocument;
    var offset = 0;
    if (Monocle.Browser.env.findNodesByScrolling) {
      // First, remove translation...
      translateToOffset(0);

      // Store scroll offsets for all windows.
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

      // Restore scroll offsets for all windows.
      while (s = scrollers.shift()) {
        s[0].scrollTo(s[1], s[2]);
      }

      // ... finally, replace translation.
      translateToOffset(p.page.m.offset);
    } else {
      offset = target.getBoundingClientRect().left;
      offset -= doc.body.getBoundingClientRect().left;
    }

    // We know at least 1px will be visible, and offset should not be 0.
    offset += 1;

    // Percent is the offset divided by the total width of the component.
    var percent = offset / (p.length * p.width);

    // Page number would be offset divided by the width of a single page.
    // var pageNum = Math.ceil(offset / pageDimensions().width);

    return percent;
  }


  API.update = update;
  API.percentageThroughOfNode = percentageThroughOfNode;

  API.locusToOffset = locusToOffset;
  API.translateToLocus = translateToLocus;

  return API;
}


Monocle.Dimensions.Columns.STYLE = {
  "columned": {
    "margin": "0",
    "padding": "0",
    "height": "100%",
    "width": "100%",
    "position": "absolute"
  },
  "column-force": {
    "min-width": "200%",
    "overflow": "hidden"
  }
}


Monocle.pieceLoaded("dimensions/columns");
