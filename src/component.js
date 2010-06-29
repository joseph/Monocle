/* COMPONENT */

// See the properties declaration for details of constructor arguments.
//
Monocle.Component = function (book, id, index, chapters, source) {
  if (Monocle == this) {
    return new Monocle.Component(book, id, index, chapters, source);
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
    //     percent: n     // how far into the component the chapter begins
    //  }
    //
    // NOTE: the percent property is calculated by the component - you only need
    // to pass in the title and the optional id string.
    //
    chapters: chapters,

    // the frame provided by dataSource.getComponent() for this component
    source: source,

    // The array of pageDivs that have applied this component. Indexed by
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
  }


  function currentlyApplyingTo(pageDiv) {
    return pageDiv.m.activeFrame.m.component == API;
  }


  function applyTo(pageDiv, waitCallback) {
    if (currentlyApplyingTo(pageDiv)) {
      return;
    }

    //console.log(id+" -> pageDiv["+pageDiv.m.pageIndex+"]");
    p.pageDivs[pageDiv.m.pageIndex] = pageDiv;

    var evtData = { 'page': pageDiv, 'source': p.source };
    pageDiv.m.reader.dispatchEvent('monocle:componentchanging', evtData);

    return loadFrame(
      pageDiv,
      function (frame, waiting) {
        setupFrame(pageDiv, frame);
        if (waiting) { waitCallback(); }
      }
    );
  }


  function loadFrame(pageDiv, callback) {
    var frame = pageDiv.m.activeFrame;

    // We own this frame now.
    frame.m.component = API;

    // Hide the frame while we're changing it.
    frame.style.visibility = "hidden";

    // Prevent about:blank overriding imported nodes in Firefox.
    // Disabled again because it seems to result in blank pages in Saf.
    //frame.contentWindow.stop();

    if (p.source.html || (typeof p.source == "string")) {   // HTML
      return loadFrameFromHTML(p.source.html || p.source, frame, callback);
    } else if (p.source.url) {                              // URL
      return loadFrameFromURL(p.source.url, frame, callback);
    } else if (p.source.nodes) {                            // NODES
      return loadFrameFromNodes(p.source.nodes, frame, callback);
    } else if (p.source.doc) {                              // DOCUMENT
      return loadFrameFromDocument(p.source.doc, frame, callback);
    }
  }


  function loadFrameFromHTML(src, frame, callback) {
    // Compress whitespace.
    src = src.replace(/\s+/g, ' ');

    // Escape single-quotes.
    src = src.replace(/\'/g, '\\\'');

    // Remove scripts. (DISABLED -- Monocle should leave this to implementers.)
    //var scriptFragment = "<script[^>]*>([\\S\\s]*?)<\/script>";
    //src = src.replace(new RegExp(scriptFragment, 'img'), '');

    // BROWSERHACK: Gecko chokes on the DOCTYPE declaration.
    if (true) {
      var doctypeFragment = "<!DOCTYPE[^>]*>";
      src = src.replace(new RegExp(doctypeFragment, 'm'), '');
    }

    src = "javascript: '" + src + "';";

    frame.onload = function () {
      frame.onload = null;
      if (callback) { callback(frame, true); }
    }
    frame.src = src;
    return 'wait';
  }


  function loadFrameFromURL(url, frame, callback) {
    frame.onload = function () {
      frame.onload = null;
      frame.cacheInitialized = true;
      if (callback) { callback(frame, true); }
    }
    frame.src = url;
    return 'wait';
  }


  function loadFrameFromNodes(nodes, frame, callback) {
    var destDoc = frame.contentDocument;
    destDoc.documentElement.innerHTML = "";
    var destHd = destDoc.createElement("head");
    var destBdy = destDoc.createElement("body");

    for (var i = 0; i < nodes.length; ++i) {
      var node = destDoc.importNode(nodes[i], true);
      destBdy.appendChild(node);
    }

    destDoc.documentElement.appendChild(destHd);
    destDoc.documentElement.appendChild(destBdy);

    if (callback) { callback(frame, false); }
    return 'ready';
  }


  function loadFrameFromDocument(srcDoc, frame, callback) {
    if (p.source.cacheCompatible && !frame.cacheInitialized) {
      return loadFrameFromURL(srcDoc.defaultView.location, frame, callback);
    }
    var destDoc = frame.contentDocument;
    destDoc.replaceChild(
      destDoc.importNode(srcDoc.documentElement, true),
      destDoc.documentElement
    );

    if (callback) { callback(frame, false); }
    return 'ready';
  }


  function setupFrame(pageDiv, frame) {
    // BROWSERHACK: WEBKIT (touch events on iframe not sent to higher elems)
    //
    // On MobileSafari, translates a click on the iframe into a click on
    // the reader's controls div.
    // Presently required to route around MobileSafari's problems with
    // iframes. But it would be very nice to rip it out.
    if (/WebKit/i.test(navigator.userAgent) && typeof Touch == "object") {
      Monocle.Compat.enableTouchProxyOnFrame(frame);
    }

    // TODO: rewrite internal links

    // Announce that the component has changed.
    var evtData = { 'page': pageDiv, 'document': frame.contentDocument };
    pageDiv.m.reader.dispatchEvent('monocle:componentchange', evtData);

    // Correct the body lineHeight to use a number, not a percentage, which
    // causes the text to jump upwards.
    var doc = frame.contentDocument;
    var win = doc.defaultView;
    var currStyle = win.getComputedStyle(doc.body, null);
    var lh = parseFloat(currStyle.getPropertyValue('line-height'));
    var fs = parseFloat(currStyle.getPropertyValue('font-size'));
    doc.body.style.lineHeight = lh / fs;

    setColumnWidth(pageDiv);
    frame.style.visibility = "visible";
    measureDimensions(pageDiv);

    // Find the place of any chapters in the component.
    locateChapters(pageDiv);
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
    /*
    return (!p.clientDimensions) ||
      (p.clientDimensions.width != pageDiv.m.sheafDiv.clientWidth) ||
      (p.clientDimensions.height != pageDiv.m.sheafDiv.clientHeight) ||
      (p.clientDimensions.scrollWidth != scrollerElement(pageDiv).scrollWidth ||
      (p.clientDimensions.fontSize != currStyle.getPropertyValue('font-size'));
    */
    var newDimensions = {
      width: pageDiv.m.sheafDiv.clientWidth,
      height: pageDiv.m.sheafDiv.clientHeight,
      scrollWidth: scrollerWidth(pageDiv),
      fontSize: currStyle.getPropertyValue('font-size')
    }
    if (
      (!p.clientDimensions) ||
      (p.clientDimensions.width != newDimensions.width) ||
      (p.clientDimensions.height != newDimensions.height) ||
      (p.clientDimensions.scrollWidth != newDimensions.scrollWidth) ||
      (p.clientDimensions.fontSize != newDimensions.fontSize)
    ) {
      console.log("DIFFERENCE!");
      console.compatDir(p.clientDimensions);
      console.compatDir(newDimensions);
      return true;
    } else {
      console.log("NO difference");
      return false;
    }
  }


  // BROWSERHACK: iOS devices don't allow scrollbars on the frame itself.
  // This means that it's the parent div that must be scrolled -- the sheaf.
  function scrollerElement(pageDiv) {
    var doc = pageDiv.m.activeFrame.contentDocument;
    var oldSL = doc.body.scrollLeft;
    var sl = doc.body.scrollLeft = doc.body.scrollWidth;
    var bodyScroller = (doc.body.scrollLeft != 0);
    doc.body.scrollLeft = oldSL;
    return bodyScroller ? doc.body : pageDiv.m.sheafDiv;
  }


  // BROWSERHACK: iOS 4+ devices sometimes report incorrect scrollWidths.
  //  1) The body scrollWidth is now always 2x what it really is.
  //  2) The sheafDiv scrollWidth is sometimes only 2x page width, despite
  //    body being much bigger.
  //
  // Other browsers (WebKit / Gecko) will always have the correct value in
  // the body scrollwidth, which is always the scrollerElement for those
  // browsers, so the correct value should always win out.
  function scrollerWidth(pageDiv) {
    // If not for iOS 4, this would just be:
    // return scrollerElement(pageDiv).scrollWidth;

    //console.log(scrollerElement(pageDiv).getBoundingClientRect().width);
    var scroller = scrollerElement(pageDiv);
    var oldSL = scroller.scrollLeft;
    scroller.scrollLeft = scroller.scrollWidth + 1;
    scroller.scrollLeft = oldSL;
    return scrollerElement(pageDiv).scrollWidth;
  }


  function measureDimensions(pageDiv) {
    var win = pageDiv.m.activeFrame.contentWindow;
    var doc = win.document;
    var currStyle = win.getComputedStyle(doc.body, null);

    p.clientDimensions = {
      width: pageDiv.m.sheafDiv.clientWidth,
      height: pageDiv.m.sheafDiv.clientHeight,
      scrollWidth: scrollerWidth(pageDiv),
      fontSize: currStyle.getPropertyValue('font-size')
    }

    // Detect single-page components.
    if (p.clientDimensions.scrollWidth == p.clientDimensions.width * 2) {
      var elems = doc.body.getElementsByTagName('*');
      if (!elems || elems.length == 0) {
        throw("Empty document body for pageDiv["+pageDiv.m.pageIndex+"]: "+id);
      }
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

    return p.clientDimensions;
  }


  function setColumnWidth(pageDiv) {
    var doc = pageDiv.m.activeFrame.contentDocument;
    var cw = pageDiv.m.sheafDiv.clientWidth;
    doc.body.style.columnWidth = cw+"px";
    doc.body.style.MozColumnWidth = cw+"px";
    doc.body.style.webkitColumnWidth = cw+"px";

    // BROWSERHACK: WEBKIT bug - iframe needs scrollbars explicitly disabled.
    if (/WebKit/i.test(navigator.userAgent)) {
      // FIXME: Gecko hates this, but WebKit requires it to hide scrollbars.
      doc.body.style.overflow = 'hidden';
    }
  }


  function locateChapters(pageDiv) {
    if (p.chapters[0] && typeof p.chapters[0].percent == "number") {
      return;
    }
    var doc = pageDiv.m.activeFrame.contentDocument;
    var scroller = scrollerElement(pageDiv);
    var oldScrollLeft = scroller.scrollLeft;
    for (var i = 0; i < p.chapters.length; ++i) {
      var chp = p.chapters[i];
      chp.percent = 0;
      if (chp.fragment) {
        var target = doc.getElementById(chp.fragment);
        while (target && target.parentNode != doc.body) {
          target = target.parentNode;
        }
        if (target) {
          target.scrollIntoView();
          chp.percent = (scroller.scrollLeft / p.clientDimensions.scrollWidth);
        }
      }
    }
    scroller.scrollTop = 0;
    scroller.scrollLeft = oldScrollLeft;

    return p.chapters;
  }


  function chapterForPage(pageN) {
    var cand = null;
    var percent = (pageN - 1) / p.clientDimensions.pages;
    for (var i = 0; i < p.chapters.length; ++i) {
      if (percent >= p.chapters[i].percent) {
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
        return Math.round(p.chapters[i].percent * p.clientDimensions.pages) + 1;
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
  API.scrollerElement = scrollerElement;

  initialize();

  return API;
}

Monocle.pieceLoaded('component');
