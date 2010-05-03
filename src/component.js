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

    // The array of iframes that are currently rendering this component.
    clientFrames: [],

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


  function preparePage(pageDiv, pageN) {
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


  function applyTo(pageDiv, callback) {
    if (pageDiv.componentFrame && pageDiv.componentFrame.component == API) {
      return;
    }
    console.log("Applying component '"+id+"' to pageDiv: " + pageDiv.pageIndex);

    if (pageDiv.componentFrame) {
      pageDiv.componentFrame.component.removeFrame(pageDiv);
    }

    // TODO: Can we reuse these frames? What's better - conserving memory, or
    // conserving processing?

    var frameLoaded = function () { setupFrame(pageDiv, callback); }
    var frame = pageDiv.componentFrame = document.createElement('iframe');
    Monocle.addListener(frame, 'load', frameLoaded);
    frame.component = API;
    frame.pageDiv = pageDiv;

    Monocle.Styles.applyRules(frame, 'component');
    p.clientFrames.push(frame);

    pageDiv.sheafDiv.appendChild(frame);
    frame.src = "javascript: '" + p.html + "';";
  }


  function setupFrame(pageDiv, callback) {
    var frame = pageDiv.componentFrame;
    var doc = frame.contentWindow.document;
    Monocle.Styles.applyRules(doc.body, 'body');

    // FIXME: presently required to route around MobileSafari's
    // problems with iframes. But it would be very nice to rip it out.
    if (/WebKit/i.test(navigator.userAgent) && typeof Touch == "object") {
      Monocle.Compat.enableTouchProxyOnFrame(frame);
    }

    setColumnWidth(pageDiv);

    clampCSS(doc);

    // TODO: rewrite internal links

    // Any top-level text node will be inserted into a fresh
    // div parent before being added to the array -- unless it is blank, in
    // which case it is discarded. (In this way we ensure that all items
    // in the array are Elements.)
    //
    var elem = doc.body.firstChild;
    while (elem) {
      if (elem.nodeType == 3) {
        var textNode = elem;
        if (elem.nodeValue.match(/^\s+$/)) {
          elem = textNode.nextSibling;
          textNode.parentNode.removeChild(textNode);
        } else {
          elem = doc.createElement('div');
          textNode.parentNode.insertBefore(elem, textNode);
          textNode.parentNode.removeChild(textNode);
        }
      }
      if (elem) {
        elem = elem.nextSibling;
      }
    }
    p.clientDimensions = null;
    measureDimensions(pageDiv);
    locateChapters(pageDiv);
    if (callback) { callback(); }
  }


  function setColumnWidth(pageDiv) {
    if (!pageDiv) {
      for (var i = 0; i < p.clientFrames.length; ++i) {
        setColumnWidth(p.clientFrames[i].pageDiv);
      }
      return;
    }
    var doc = pageDiv.componentFrame.contentWindow.document;
    var cw = pageDiv.sheafDiv.clientWidth;
    doc.body.style.columnWidth = cw+"px";
    doc.body.style.MozColumnWidth = cw+"px";
    doc.body.style.webkitColumnWidth = cw+"px";

    if (/WebKit/i.test(navigator.userAgent)) {
      // FIXME: Gecko hates this, but WebKit requires it to hide scrollbars.
      // Still, browser sniffing is an evil.
      doc.body.style.overflow = 'hidden';
    }
  }


  function removeFrame(pageDiv) {
    if (!pageDiv.componentFrame) {
      throw("Requested to remove a frame that does not exist.");
    }
    if (pageDiv.componentFrame && pageDiv.componentFrame.component != API) {
      throw("Requested to remove a frame that is not mine.")
    }
    var idx = p.clientFrames.indexOf(pageDiv.componentFrame);
    if (idx < 0) {
      throw("Requested to remove a frame that is not in my list of frames.");
    }
    pageDiv.sheafDiv.removeChild(pageDiv.componentFrame);
    var rest = p.clientFrames.slice(idx + 1);
    p.clientFrames.length = idx;
    p.clientFrames.push.apply(p.clientFrames, rest);
    pageDiv.componentFrame = null;
    return true;
  }


  function updateDimensions(pageDiv) {
    if (haveDimensionsChanged(pageDiv)) {
      setColumnWidth();
      measureDimensions(pageDiv);
      locateChapters(pageDiv);
      return true;
    } else {
      return false;
    }
  }


  // Returns true or false.
  function haveDimensionsChanged(pageDiv) {
    var win = pageDiv.componentFrame.contentWindow;
    var currStyle = win.getComputedStyle(win.document.body, null);
    return (!p.clientDimensions) ||
      (p.clientDimensions.width != pageDiv.sheafDiv.clientWidth) ||
      (p.clientDimensions.height != pageDiv.sheafDiv.clientHeight) ||
      (p.clientDimensions.scrollWidth != win.document.body.scrollWidth) ||
      (p.clientDimensions.fontSize != currStyle.getPropertyValue('font-size'));
  }


  // TODO: Rewrite this to insert a dynamic stylesheet into the frame to set
  // the clamping.
  function clampCSS(doc) {
    //console.log('Clamping css for ' + body);
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


  function measureDimensions(pageDiv) {
    var win = pageDiv.componentFrame.contentWindow;
    var doc = win.document;
    var currStyle = win.getComputedStyle(doc.body, null);

    // This is weird. First time you access this value, it's doubled. Next time,
    // it's the correct amount. MobileSafari only.
    var junk = doc.body.scrollWidth;

    p.clientDimensions = {
      width: pageDiv.sheafDiv.clientWidth,
      height: pageDiv.sheafDiv.clientHeight,
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
      "Pages for '"+id+"' in pageDiv["+pageDiv.pageIndex+"]: " +
      p.clientDimensions.pages
    );

    return p.clientDimensions;
  }


  function locateChapters(pageDiv) {
    var doc = pageDiv.componentFrame.contentWindow.document;
    var scrollers = [doc.body, pageDiv.sheafDiv];
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


  // A shortcut to p.clientDimensions.pages.
  //
  function lastPageNumber() {
    return p.clientDimensions ? p.clientDimensions.pages : null;
  }


  API.applyTo = applyTo;
  API.preparePage = preparePage;
  API.updateDimensions = updateDimensions;
  API.removeFrame = removeFrame;
  API.chapterForPage = chapterForPage;
  API.pageForChapter = pageForChapter;
  API.lastPageNumber = lastPageNumber;

  initialize();

  return API;
}

Monocle.pieceLoaded('component');
