Monocle.Dimensions.Columns = function (pageDiv) {

  var API = { constructor: Monocle.Dimensions.Columns }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    page: pageDiv,
    reader: pageDiv.m.reader,
    dirty: true
  }


  function initialize() {
    p.reader.listen('monocle:componentchange', componentChanged);
  }


  function hasChanged() {
    if (p.dirty) { return true; }
    var newMeasurements = rawMeasurements();
    return (
      (!p.measurements) ||
      (p.measurements.width != newMeasurements.width) ||
      (p.measurements.height != newMeasurements.height) ||
      (p.measurements.scrollWidth != newMeasurements.scrollWidth)
    );
  }


  function measure() {
    setColumnWidth();
    p.measurements = rawMeasurements();

    // BROWSERHACK: Detect single-page components in WebKit browsers by checking
    // whether the last element in the component is beyond the first page.
    //
    // This is because (due to the 'width: 200%' rule on the body) a one-page
    // component will measure as two pages wide in WebKit browsers. For some
    // reason this doesn't apply to Gecko.
    if (
      Monocle.Browser.has.iframeDoubleWidthBug &&
      p.measurements.scrollWidth == p.measurements.width * 2
    ) {
      var doc = p.page.m.activeFrame.contentDocument;
      var lc;
      for (var i = doc.body.childNodes.length - 1; i >= 0; --i) {
        lc = doc.body.childNodes[i];
        if (lc.getBoundingClientRect) { break; }
      }
      if (!lc || !lc.getBoundingClientRect) {
        console.warn('Empty document for page['+p.page.m.pageIndex+']');
        p.measurements.scrollWidth = p.measurements.width;
      } else {
        // NB: right is generally wider than width if the column styles have
        // had a chance to apply to the component. Otherwise bottom will
        // be greater than height. See tests/columns.
        var bcr = lc.getBoundingClientRect();
        if (
          bcr.right > p.measurements.width ||
          bcr.bottom > p.measurements.height
        ) {
          p.measurements.scrollWidth = p.measurements.width * 2;
        } else {
          p.measurements.scrollWidth = p.measurements.width;
        }
      }
    }

    p.length = Math.ceil(p.measurements.scrollWidth / p.measurements.width);
    // console.log(
    //   'page['+p.page.m.pageIndex+'] -> '+p.length+
    //   ' ('+p.page.m.activeFrame.m.component.properties.id+')'
    // );
    p.dirty = false;
    return p.length;
  }


  function pages() {
    if (p.dirty) {
      console.warn('Accessing pages() when dimensions are dirty.')
      return 0;
    }
    return p.length;
  }


  function percentageThroughOfNode(target) {
    if (!target) {
      return 0;
    }
    var doc = p.page.m.activeFrame.contentDocument;
    var offset = 0;
    if (target.getBoundingClientRect) {
      offset = target.getBoundingClientRect().left;
      offset -= doc.body.getBoundingClientRect().left;
    } else {
      var scroller = scrollerElement();
      var oldScrollLeft = scroller.scrollLeft;
      target.scrollIntoView();
      offset = scroller.scrollLeft;
      scroller.scrollTop = 0;
      scroller.scrollLeft = oldScrollLeft;
    }

    //console.log(id + ": " + offset + " of " + p.measurements.scrollWidth);
    var percent = offset / p.measurements.scrollWidth;
    return percent;
  }


  function componentChanged(evt) {
    if (evt.m['page'] != p.page) { return; }
    var doc = evt.m['document'];
    Monocle.Styles.applyRules(doc.body, k.BODY_STYLES);

    // BROWSERHACK: WEBKIT bug - iframe needs scrollbars explicitly disabled.
    if (Monocle.Browser.is.WebKit) {
      doc.documentElement.style.overflow = 'hidden';
    }

    p.dirty = true;
  }


  function setColumnWidth() {
    var cw = p.page.m.sheafDiv.clientWidth;
    if (currBodyStyleValue('column-width') != cw+"px") {
      Monocle.Styles.affix(columnedElement(), 'column-width', cw+"px");
      p.dirty = true;
    }
  }


  function rawMeasurements() {
    var sheaf = p.page.m.sheafDiv;
    return {
      width: sheaf.clientWidth,
      height: sheaf.clientHeight,
      scrollWidth: scrollerWidth()
    }
  }


  // Returns the element that is offset to the left in order to display
  // a particular page.
  //
  // This is a BROWSERHACK:
  //   iOS devices don't allow scrollbars on the frame itself.
  //   This means that it's the parent div that must be scrolled -- the sheaf.
  //
  function scrollerElement() {
    if (Monocle.Browser.has.mustScrollSheaf) {
      return p.page.m.sheafDiv;
    } else {
      return columnedElement();
    }
  }


  // Returns the element to which columns CSS should be applied.
  function columnedElement() {
    return p.page.m.activeFrame.contentDocument.body;
  }


  // Returns the width of the offsettable area of the scroller element. By
  // definition, the number of pages is always this number divided by the
  // width of a single page (eg, the client area of the scroller element).
  //
  // BROWSERHACK:
  //
  // iOS 4+ devices sometimes report incorrect scrollWidths.
  //  1) The body scrollWidth is now always 2x what it really is.
  //  2) The sheafDiv scrollWidth is sometimes only 2x page width, despite
  //    body being much bigger.
  //
  // In other browsers, the only consistent way to measure the width of the
  // body is by comparing the first element's left to the last element's right.
  // (There are bizarre differences between Gecko, recent Webkit (~534) and
  // older Webkit.)
  //
  function scrollerWidth() {
    var bdy = p.page.m.activeFrame.contentDocument.body;
    if (Monocle.Browser.has.iframeDoubleWidthBug) {
      if (Monocle.Browser.on.Kindle3) {
        return scrollerElement().scrollWidth;
      } else if (Monocle.Browser.on.Android) {
        // FIXME: On Android, bdy.scrollWidth reports the wrong value if the
        // browser's Text Size setting is anything other than "Normal".
        // Seems like an Android bug to me.
        //
        // If you could detect the text size, you could compensate for it. Eg,
        // a Text Size of "Large" -> multipy bdy.scrollWidth by 1.5.
        return bdy.scrollWidth;
      } else if (Monocle.Browser.iOSVersion < "4.1") {
        var hbw = bdy.scrollWidth / 2;
        var sew = scrollerElement().scrollWidth;
        return Math.max(sew, hbw);
      } else {
        bdy.scrollWidth; // Throw one away. Nuts.
        var hbw = bdy.scrollWidth / 2;
        return hbw;
      }
    } else if (bdy.getBoundingClientRect) {
      // FIXME: this is quite inefficient.
      var elems = bdy.getElementsByTagName('*');
      var bdyRect = bdy.getBoundingClientRect();
      var l = bdyRect.left, r = bdyRect.right;
      for (var i = elems.length - 1; i >= 0; --i) {
        var rect = elems[i].getBoundingClientRect();
        l = Math.min(l, rect.left);
        r = Math.max(r, rect.right);
      }
      return Math.abs(l) + Math.abs(r);
    }

    // Fall back to scrollWidth.
    return scrollerElement().scrollWidth;
  }


  function currBodyStyleValue(property) {
    var win = p.page.m.activeFrame.contentWindow;
    var doc = win.document;
    if (!doc.body) { return null; }
    var currStyle = win.getComputedStyle(doc.body, null);
    return currStyle.getPropertyValue(property);
  }


  function locusToOffset(locus) {
    return 0 - (p.measurements.width * (locus.page - 1));
  }


  function translateToLocus(locus) {
    var offset = locusToOffset(locus);
    p.page.m.offset = 0 - offset;
    if (k.SETX) {
      var bdy = p.page.m.activeFrame.contentDocument.body;
      Monocle.Styles.affix(bdy, "transform", "translateX("+offset+"px)");
    } else {
      var scrElem = scrollerElement();
      scrElem.scrollLeft = 0 - offset;
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


Monocle.Dimensions.Columns.BODY_STYLES = {
  "position": "absolute",
  "height": "100%",
  "-webkit-column-gap": "0",
  "-webkit-column-fill": "auto",
  "-moz-column-gap": "0",
  "-moz-column-fill": "auto",
  "column-gap": "0",
  "column-fill": "auto"
}

Monocle.Dimensions.Columns.SETX = true; // Set to false for scrollLeft.

if (Monocle.Browser.has.iframeDoubleWidthBug) {
  Monocle.Dimensions.Columns.BODY_STYLES["min-width"] = "200%";
} else {
  Monocle.Dimensions.Columns.BODY_STYLES["width"] = "100%";
}
