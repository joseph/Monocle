Monocle.Dimensions.Columns = function (pageDiv) {

  var API = { constructor: Monocle.Dimensions.Columns }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    page: pageDiv,
    reader: pageDiv.m.reader,
    length: 0,
    width: 0
  }

  // Logically, forceColumn browsers can't have a gap, because that would
  // make the minWidth > 200%. But how much greater? Not worth the effort.
  k.GAP = Monocle.Browser.env.forceColumns ? 0 : 20;

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

    var cer = Monocle.Styles.rulesToString(k.STYLE['columned']);
    cer += 'width: '+pdims.col+'px !important;';
    cer += Monocle.Browser.css.toCSSDeclaration('column-width', pdims.col+'px');
    cer += Monocle.Browser.css.toCSSDeclaration('column-gap', k.GAP+'px');
    cer += Monocle.Browser.css.toCSSDeclaration('column-fill', 'auto');
    cer += Monocle.Browser.css.toCSSDeclaration('transform', 'none');

    if (Monocle.Browser.env.forceColumns && ce.scrollHeight > pdims.height) {
      cer += Monocle.Styles.rulesToString(k.STYLE['column-force']);
      if (Monocle.DEBUG) {
        console.warn("Force columns ("+ce.scrollHeight+" > "+pdims.height+")");
      }
    }

    var rules = [
      'html#RS\\:monocle * {',
        'max-width: '+pdims.col+'px !important;',
      '}',
      'img, video, audio, object, svg {',
        'max-height: '+pdims.height+'px !important;',
      '}'
    ]

    // IE10 hack.
    if (Monocle.Browser.env.documentElementHasScrollbars) {
      rules.push('html { overflow: hidden !important; }');
    }

    rules = rules.join('\n');

    var doc = p.page.m.activeFrame.contentDocument;
    var head = doc.querySelector('head');
    var sty = head.querySelector('style#monocle_column_rules');
    if (!sty) {
      sty = doc.createElement('style');
      sty.id = 'monocle_column_rules';
      head.appendChild(sty);
    }

    // Update offset because we're translating to zero.
    p.page.m.offset = 0;

    // Make sure that the frame is exactly the same width as the column.
    p.page.m.activeFrame.style.width = p.width+'px';

    // Apply style changes to the contents of the component.
    ce.style.cssText = cer;
    sty.innerHTML = rules;

    if (Monocle.Browser.env.scrollToApplyStyle) {
      ce.scrollLeft = 0;
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
    var w;
    if (elem.getBoundingClientRect) {
      w = elem.getBoundingClientRect().width;
    } else {
      w = elem.clientWidth;
    }
    w = Math.floor(w); // ensure it is an integer
    w -= w % 2; // ensure it is an even number
    return { col: w, width: w + k.GAP, height: elem.clientHeight }
  }


  function columnCount() {
    return Math.ceil(columnedWidth() / p.width)
  }


  function locusToOffset(locus) {
    return p.width * (locus.page - 1);
  }


  // Moves the columned element to the offset implied by the locus.
  //
  // The 'transition' argument is optional, allowing the translation to be
  // animated. If not given, no change is made to the columned element's
  // transition property.
  //
  function translateToLocus(locus, transition) {
    var offset = locusToOffset(locus);
    p.page.m.offset = offset;
    translateToOffset(offset, transition);
    return offset;
  }


  function translateToOffset(offset, transition) {
    var ce = columnedElement();
    if (transition) {
      Monocle.Styles.affix(ce, "transition", transition);
    }
    // NB: can't use setX as it causes a flicker on iOS.
    Monocle.Styles.affix(ce, "transform", "translateX(-"+offset+"px)");
  }


  function percentageThroughOfNode(target) {
    if (!target) { return 0; }
    var doc = p.page.m.activeFrame.contentDocument;
    var offset = 0;
    if (Monocle.Browser.env.findNodesByScrolling) {
      // First, remove translation...
      translateToOffset(0);

      // Store scroll offsets for all windows.
      var win, s;
      win = s = p.page.m.activeFrame.contentWindow;
      var scrollers = [
        [win, win.scrollX, win.scrollY],
        [window, window.scrollX, window.scrollY]
      ];

      var scroller, x;
      if (Monocle.Browser.env.sheafIsScroller) {
        scroller = p.page.m.sheafDiv;
        x = scroller.scrollLeft;
        target.scrollIntoView();
        offset = scroller.scrollLeft;
      } else {
        scroller = win;
        x = scroller.scrollX;
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

    return percent;
  }


  API.update = update;
  API.percentageThroughOfNode = percentageThroughOfNode;

  API.locusToOffset = locusToOffset;
  API.translateToLocus = translateToLocus;

  return API;
}


Monocle.Dimensions.Columns.STYLE = {
  'columned': {
    'border': 'none !important',
    'margin': '0 !important',
    'padding': '0 !important',
    'height': '100% !important',
    'position': 'absolute !important'
  },
  'column-force': {
    'width': '100% !important',
    'min-width': '200% !important',
    'overflow': 'hidden !important'
  }
}
