/* COMPONENT */

// See the properties declaration for details of constructor arguments.
//
Monocle.Component = function (book, id, index, chapters, html) {
  if (Monocle == this) {
    return new Monocle.Component(book, id, index, chapters, html);
  }

  // Constants.
  var k = {
  }

  // Properties.
  var p = {
    // a back-reference to the public API of the book that owns this component
    book: book,

    // the string that represents this component in the book's component array
    id: id,

    // the position in the book's components array of this component
    index: index,

    // The chapters argument is an array of objects that list the chapters that
    // can be found in this component. A chapter object is defined as:
    //
    //  {
    //     title: str,
    //     fragment: str, // optional anchor id
    //     page: n        // number of the page on which the chapter begins
    //  }
    //
    // NOTE: the page property is calculated by the component - you only need
    // to pass in the title and the optional id string.
    //
    // The page property is invalidated by dimensional changes in the reader,
    // and will be regenerated as soon as possible thereafter.
    //
    chapters: chapters,

    // the HTML provided by dataSource.getComponent() for this component
    html: html,

    // The array of pageDivs that have rendered this component. Indexed by
    // their pageIndex.
    pageDivs: [],

    // The current dimensions of the client node that holds the elements of
    // this component. (The assumption is that all client nodes will have
    // identical dimensions — otherwise nothing will work as expected.)
    //
    // Defined as:
    //
    //   {
    //     width: n,            // in pixels
    //     height: n,           // in pixels
    //     scrollWidth: n,      // in pixels
    //     fontSize: s,         // css style property value of the node
    //     pages: n             // number of pages in this component
    //   }
    //
    // Obviously, this data is invalidated by dimensional changes in the reader.
    //
    clientDimensions: []
  }

  // Methods and properties available to external code.
  var API = {
    constructor: Monocle.Component,
    constants: k,
    properties: p
  }


  function initialize() {
    if (!p.html) {
      console.log("Accessed an empty component: " + p.id);
      p.html = "<p></p>"
    }

    // Compress whitespace.
    p.html = p.html.replace(/\s+/g, ' ');

    // Escape single-quotes.
    p.html = p.html.replace(/\'/g, '\\\'');

    // Remove scripts.
    var scriptFragment = "<script[^>]*>([\\S\\s]*?)<\/script>";
    p.html = p.html.replace(new RegExp(scriptFragment, 'img'), '');

    // Gecko chokes on the DOCTYPE declaration.
    var doctypeFragment = "<!DOCTYPE[^>]*>";
    p.html = p.html.replace(new RegExp(doctypeFragment, 'm'), '');
  }


  function currentlyApplyingTo(pageDiv) {
    return pageDiv.m.activeFrame && pageDiv.m.activeFrame.m.component == API;
  }


  function applyTo(pageDiv, callback) {
    if (currentlyApplyingTo(pageDiv)) {
      return;
    }
    console.log(id+" -> pageDiv["+pageDiv.m.pageIndex+"]");
    p.pageDivs[pageDiv.m.pageIndex] = pageDiv;

    var evtData = { 'page': pageDiv, 'html': p.html };
    if (!pageDiv.m.reader.dispatchEvent('monocle:componentchanging', evtData)) {
      callback();
      return;
    }
    var html = evtData.html;
    blankPage(pageDiv);

    var frame = pageDiv.m.componentFrames[p.index];
    if (frame) {
      console.log("Reusing existing frame.")
      frame.style.display = "block";
      pageDiv.m.activeFrame = frame;
      setupFrame(pageDiv, callback);
    } else {
      console.log("Generating new frame.")
      frame = document.createElement('iframe');
      pageDiv.m.componentFrames[p.index] = frame;
      pageDiv.m.activeFrame = frame;
      frame.m = {
        'component': API,
        'pageDiv': pageDiv
      }
      frame.style.visibility = "hidden";
      pageDiv.m.sheafDiv.appendChild(frame);

      var frameLoaded = function () { setupFrame(pageDiv, callback); }
      Monocle.addListener(frame, 'load', frameLoaded);

      frame.src = "javascript: '" + html + "';";
    }
  }


  function setupFrame(pageDiv, callback) {
    var frame = pageDiv.m.activeFrame;
    var doc = frame.contentDocument;

    // FIXME: cross-browser?
    if (!doc.getElementsByTagName('head')[0]) {
      var head = doc.createElement('head');
      doc.documentElement.insertBefore(head, doc.body);
    }

    applyStyles(pageDiv);
    frame.style.visibility = "visible";
    pageDiv.m.reader.addListener(
      'monocle:styles',
      function () { applyStyles(pageDiv); }
    );

    // FIXME: presently required to route around MobileSafari's
    // problems with iframes. But it would be very nice to rip it out.
    if (/WebKit/i.test(navigator.userAgent) && typeof Touch == "object") {
      Monocle.Compat.enableTouchProxyOnFrame(frame);
    }

    setColumnWidth(pageDiv);

    clampCSS(doc);

    // TODO: rewrite internal links

    p.clientDimensions = null;
    measureDimensions(pageDiv);
    pageDiv.m.reader.dispatchEvent(
      'monocle:componentchange',
      {
        'page': pageDiv,
        'document': doc
      }
    );
    callback();
  }


  function blankPage(pageDiv) {
    if (pageDiv.m.activeFrame) {
      pageDiv.m.activeFrame.style.display = 'none';
    }
    pageDiv.m.activeFrame = null;
  }


  function updateDimensions(pageDiv) {
    if (haveDimensionsChanged(pageDiv)) {
      for (var i = 0; i < p.pageDivs.length; ++i) {
        if (p.pageDivs[i]) {
          setColumnWidth(p.pageDivs[i]);
        }
      }
      measureDimensions(pageDiv);
      return true;
    } else {
      return false;
    }
  }


  // Returns true or false.
  function haveDimensionsChanged(pageDiv) {
    var win = pageDiv.m.activeFrame.contentWindow;
    var currStyle = win.getComputedStyle(win.document.body, null);
    return (!p.clientDimensions) ||
      (p.clientDimensions.width != pageDiv.m.sheafDiv.clientWidth) ||
      (p.clientDimensions.height != pageDiv.m.sheafDiv.clientHeight) ||
      (p.clientDimensions.scrollWidth != win.document.body.scrollWidth) ||
      (p.clientDimensions.fontSize != currStyle.getPropertyValue('font-size'));
  }


  function measureDimensions(pageDiv) {
    var win = pageDiv.m.activeFrame.contentWindow;
    var doc = win.document;
    var currStyle = win.getComputedStyle(doc.body, null);

    // This is weird. First time you access this value, it's doubled. Next time,
    // it's the correct amount. MobileSafari only.
    var junk = doc.body.scrollWidth;

    p.clientDimensions = {
      width: pageDiv.m.sheafDiv.clientWidth,
      height: pageDiv.m.sheafDiv.clientHeight,
      scrollWidth: doc.body.scrollWidth,
      fontSize: currStyle.getPropertyValue('font-size')
    }

    // Detect single-page components.
    if (p.clientDimensions.scrollWidth == p.clientDimensions.width * 2) {
      var elems = doc.body.getElementsByTagName('*');
      var elem = elems[elems.length - 1];
      var lcEnd = elem.offsetTop + elem.offsetHeight;
      p.clientDimensions.scrollWidth = p.clientDimensions.width *
        (lcEnd > p.clientDimensions.height ? 2 : 1);
    }

    p.clientDimensions.pages = Math.ceil(
      p.clientDimensions.scrollWidth / p.clientDimensions.width
    );

    console.log(
      ""+id+" -> pageDiv["+pageDiv.m.pageIndex+"] -> page count: " +
      p.clientDimensions.pages
    );

    //locateChapters(pageDiv);

    return p.clientDimensions;
  }


  function setColumnWidth(pageDiv) {
    var doc = pageDiv.m.activeFrame.contentDocument;
    var cw = pageDiv.m.sheafDiv.clientWidth;
    doc.body.style.columnWidth = cw+"px";
    doc.body.style.MozColumnWidth = cw+"px";
    doc.body.style.webkitColumnWidth = cw+"px";

    if (/WebKit/i.test(navigator.userAgent)) {
      // FIXME: Gecko hates this, but WebKit requires it to hide scrollbars.
      // Still, browser sniffing is an evil.
      doc.body.style.overflow = 'hidden';
    }
  }


  function applyStyles(pageDiv) {
    if (currentlyApplyingTo(pageDiv)) {
      var frame = pageDiv.m.activeFrame;
      Monocle.Styles.applyRules(frame, 'component');
      if (frame.contentDocument && frame.contentDocument.body) {
        Monocle.Styles.applyRules(frame.contentDocument.body, 'body');
      }
    }
  }


  function clampCSS(doc) {
    // TODO: move to somewhere it can be configured...
    var rules = "body * { float: none !important; clear: none !important; }" +
      "p { margin-left: 0 !important; margin-right: 0 !important; }" +
      "table, img { max-width: 100% !important; max-height: 90% !important; }";

    var styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    if (styleTag.styleSheet) {
      styleTag.styleSheet.cssText = rules;
    } else {
      styleTag.appendChild(document.createTextNode(rules));
    }

    doc.getElementsByTagName('head')[0].appendChild(styleTag);

    // Correct the body lineHeight to use a number, not a percentage, which
    // causes the text to jump upwards.
    var win = doc.defaultView;
    var currStyle = win.getComputedStyle(doc.body, null);
    var lh = parseFloat(currStyle.getPropertyValue('line-height'));
    var fs = parseFloat(currStyle.getPropertyValue('font-size'));
    doc.body.style.lineHeight = lh / fs;
  }


  function locateChapters(pageDiv) {
    var doc = pageDiv.m.activeFrame.contentDocument;
    var scrollers = [doc.body, pageDiv.m.sheafDiv];
    for (var i = 0; i < p.chapters.length; ++i) {
      var chp = p.chapters[i];
      chp.page = 1;
      if (chp.fragment) {
        var target = doc.getElementById(chp.fragment);
        while (target && target.parentNode != doc.body) {
          target = target.parentNode;
        }
        if (target) {
          target.scrollIntoView();
          chp.page = (
            Math.max(scrollers[0].scrollLeft, scrollers[1].scrollLeft) /
            p.clientDimensions.width
          ) + 1;
        }
      }
    }
    scrollers[0].scrollLeft = 0;
    scrollers[1].scrollLeft = 0;

    return p.chapters;
  }


  function chapterForPage(pageN) {
    var cand = null;
    for (var i = 0; i < p.chapters.length; ++i) {
      if (pageN >= p.chapters[i].page) {
        cand = p.chapters[i];
      } else {
        return cand;
      }
    }
    return cand;
  }


  function pageForChapter(fragment) {
    if (!fragment) {
      return 1;
    }
    for (var i = 0; i < p.chapters.length; ++i) {
      if (p.chapters[i].fragment == fragment) {
        return p.chapters[i].page;
      }
    }
    return null;
  }


  // A shortcut to p.clientDimensions.pages.
  //
  function lastPageNumber() {
    return p.clientDimensions ? p.clientDimensions.pages : null;
  }


  API.currentlyApplyingTo = currentlyApplyingTo;
  API.applyTo = applyTo;
  API.updateDimensions = updateDimensions;
  API.chapterForPage = chapterForPage;
  API.pageForChapter = pageForChapter;
  API.lastPageNumber = lastPageNumber;

  initialize();

  return API;
}

Monocle.pieceLoaded('component');
