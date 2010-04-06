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

    var scriptFragment = "<script[^>]*>([\\S\\s]*?)<\/script>";
    p.html = p.html.replace(new RegExp(scriptFragment, 'img'), '');
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


  function applyTo(pageDiv) {
    if (pageDiv.contentFrame && pageDiv.contentFrame.component == API) {
      return;
    }
    console.log("Applying component '"+id+"' to pageDiv: " + pageDiv.pageIndex);

    if (pageDiv.contentFrame) {
      pageDiv.scrollerDiv.removeChild(pageDiv.contentFrame);
    }

    // TODO: Can we reuse these frames? What's better - conserving memory, or
    // conserving processing?

    var frame = pageDiv.contentFrame = document.createElement('iframe');
    frame.src = "javascript: '';";
    frame.component = API;
    pageDiv.scrollerDiv.appendChild(frame);
    frame.style.cssText = Monocle.Styles.ruleText('content');

    var doc = frame.contentWindow.document;

    doc.open();
    doc.write(p.html);
    doc.close();

    // TODO: move to Styles?
    doc.body.style.cssText =
      "margin: 0;" +
      "padding: 0;" +
      "position: absolute;" +
      "height: 100%;" +
      "min-width: 200%;" +
      "-webkit-column-gap: 0;" +
      "-webkit-column-fill: auto;" +
      "-moz-column-gap: 0;" +
      "-moz-column-fill: 0;";

    // FIXME: Gecko hates this, but WebKit requires it to hide scrollbars.
    // Still, browser sniffing is an evil.
    if (/WebKit/i.test(navigator.userAgent)) {
      doc.body.style.overflow = 'hidden';
      doc.body.style.webkitTextSizeAdjust = "none";
    }

    setColumnWidth(pageDiv);

    clampCSS(doc.body);

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
  }


  function setColumnWidth(pageDiv) {
    var doc = pageDiv.contentFrame.contentWindow.document;
    var cw = pageDiv.scrollerDiv.clientWidth;
    doc.body.style.columnWidth = cw+"px";
    doc.body.style.MozColumnWidth = cw+"px";
    doc.body.style.webkitColumnWidth = cw+"px";
  }


  function updateDimensions(pageDiv) {
    if (haveDimensionsChanged(pageDiv)) {
      setColumnWidth(pageDiv);
      //positionImages(pageDiv);
      measureDimensions(pageDiv);
      locateChapters(pageDiv);

      return true;
    } else {
      return false;
    }
  }


  // Returns true or false.
  function haveDimensionsChanged(pageDiv) {
    return (!p.clientDimensions) ||
      (p.clientDimensions.width != pageDiv.scrollerDiv.clientWidth) ||
      (p.clientDimensions.height != pageDiv.scrollerDiv.clientHeight);// ||

      // FIXME: need a better solution for detecting scaled-up text.
      //(p.clientDimensions.fontSize != body.style.fontSize);
  }


  // TODO: Rewrite this to insert a dynamic stylesheet into the frame to set
  // the clamping.
  function clampCSS(body) {
    console.log('Clamping css for ' + body);
    var clampDimensions = function (elem) {
      elem.style.cssText +=
        // FIXME: helps with text-indent, but images get cut off at page breaks.
        //"float: left;" +
        "max-width: 100% !important;" +
        "max-height: 100% !important; ";
    }
    var elems = body.getElementsByTagName('img');
    for (var i = elems.length - 1; i >= 0; --i) {
      clampDimensions(elems[i]);
    }
    var elems = body.getElementsByTagName('table');
    for (var i = elems.length - 1; i >= 0; --i) {
      clampDimensions(elems[i]);
    }
  }


  // function positionImages(node) {
  //   var node = pageDiv.contentFrame.contentWindow.document.body;
  //   if (!node.getBoundingClientRect) {
  //     console.log('Image positioning not supported');
  //     return;
  //   } else {
  //     console.log('Positioning images to top of pages');
  //   }
  //   var cRect = node.getBoundingClientRect();
  //   var imgs = node.getElementsByTagName('img');
  //   for (var i = 0; i < imgs.length; ++i) {
  //     var iRect = imgs[i].getBoundingClientRect();
  //     if (iRect.top == cRect.top) {
  //       imgs[i].style.marginTop = 0;
  //     } else {
  //       imgs[i].style.marginTop = (cRect.height - (iRect.top - cRect.top))+"px";
  //     }
  //   }
  // }


  function measureDimensions(pageDiv) {
    var doc = pageDiv.contentFrame.contentWindow.document;
    p.clientDimensions = {
      width: pageDiv.scrollerDiv.clientWidth,
      height: pageDiv.scrollerDiv.clientHeight,
      scrollWidth: doc.body.scrollWidth//,

      // FIXME: need a better solution for detecting scaled-up text.
      //fontSize: doc.body.style.fontSize
    }

    if (p.clientDimensions.scrollWidth == p.clientDimensions.width * 2) {
      var lcEnd = doc.body.lastChild.offsetTop + doc.body.lastChild.offsetHeight;
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
    var doc = pageDiv.contentFrame.contentWindow.document;
    var scroller = doc.body; // pageDiv.scrollerDiv;
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
          chp.page = (scroller.scrollLeft / p.clientDimensions.width) + 1;
        }
      }
    }
    doc.body.scrollLeft = 0;

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
  API.chapterForPage = chapterForPage;
  API.pageForChapter = pageForChapter;
  API.lastPageNumber = lastPageNumber;

  initialize();

  return API;
}

Monocle.pieceLoaded('component');
