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

    // An array of elements that will hold the elements of this component.
    //
    clientNodes: [],

    // An array of arrays of HTML elements -- one for each client node.
    // Accessed as: elementsForClient[node.index][n]
    //
    elementsForClient: [],

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

    var elems = p.elementsForClient[0] = [];

    var scriptFragment = "<script[^>]*>([\\S\\s]*?)<\/script>";
    p.html = p.html.replace(new RegExp(scriptFragment, 'img'), '');
  }


  function nodeIndex(node) {
    return p.clientNodes.indexOf(node);
  }


  function prepareNode(node, pageN) {
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


  function applyTo(node) {
    p.clientNodes[nodeIndex(node)] = null;
    registerClient(node);
  }


  function updateDimensions(node) {
    registerClient(node);

    if (haveDimensionsChanged(node)) {
      clampCSS(node);
      //positionImages(node);
      measureDimensions(node);
      locateChapters(node);

      return true;
    } else {
      return false;
    }
  }


  function registerClient(node) {
    if (nodeIndex(node) != -1) {
      // Already registered.
      return;
    }
    p.clientNodes.push(node);

    // Any top-level text node will be inserted into a fresh
    // div parent before being added to the array -- unless it is blank, in
    // which case it is discarded. (In this way we ensure that all items
    // in the array are Elements.)
    //
    // TODO: pull out <link rel="stylesheet"> and <style> tags, apply to head.
    // TODO: pluck body from html, apply to tmpDiv.
    // TODO: rewrite internal links

    //node.open();
    node.write(p.html);
    //node.close();
    node.body.style.cssText =
      "margin: 0;" +
      "padding: 0;" +
      "position: absolute;" +
      "height: 100%;" +
      "min-width: 200%;" +
      "-webkit-column-gap: 0;" +
      "-webkit-column-fill: auto;" +
      "-moz-column-gap: 0;" +
      "-moz-column-fill: 0;" +
      //"overflow: hidden;" +
      "-webkit-column-width: " + node.body.clientWidth + "px;" +
      "-moz-column-width: " + node.body.clientWidth + "px;";

    console.log("Applied new document body.");

    var elem = node.body.firstChild;
    while (elem) {
      if (elem.nodeType == 3) {
        var textNode = elem;
        if (elem.nodeValue.match(/^\s+$/)) {
          elem = textNode.nextSibling;
          textNode.parentNode.removeChild(textNode);
        } else {
          elem = node.createElement('div');
          textNode.parentNode.insertBefore(elem, textNode);
          textNode.parentNode.removeChild(textNode);
        }
      }
      if (elem) {
        elem = elem.nextSibling;
      }
    }
  }


  // Returns true or false.
  function haveDimensionsChanged(node) {
    return (!p.clientDimensions) ||
      //(p.clientDimensions.width != node.body.clientWidth) ||
      (p.clientDimensions.height != node.body.clientHeight);// ||
      //(p.clientDimensions.fontSize != node.style.fontSize);
  }


  function clampCSS(node) {
    console.log('Clamping css for ' + node);
    var clampDimensions = function (elem) {
      elem.style.cssText +=
        "float: left;" +
        "max-width: 100% !important;" +
        "max-height: 100% !important; ";
    }
    var elems = node.getElementsByTagName('img');
    for (var i = elems.length - 1; i >= 0; --i) {
      clampDimensions(elems[i]);
    }
    var elems = node.getElementsByTagName('table');
    for (var i = elems.length - 1; i >= 0; --i) {
      clampDimensions(elems[i]);
    }
  }


  function positionImages(node) {
    if (!node.getBoundingClientRect) {
      console.log('Image positioning not supported');
      return;
    } else {
      console.log('Positioning images to top of pages');
    }
    var cRect = node.getBoundingClientRect();
    var imgs = node.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; ++i) {
      var iRect = imgs[i].getBoundingClientRect();
      if (iRect.top == cRect.top) {
        imgs[i].style.marginTop = 0;
      } else {
        imgs[i].style.marginTop = (cRect.height - (iRect.top - cRect.top))+"px";
      }
    }
  }


  function measureDimensions(node) {
    p.clientDimensions = {
      width: 263, //node.body.clientWidth,
      height: node.body.clientHeight,
      scrollWidth: node.body.scrollWidth//,
      //fontSize: node.style.fontSize
    }

    if (p.clientDimensions.scrollWidth == p.clientDimensions.width * 2) {
      var lcEnd = node.body.lastChild.offsetTop + node.body.lastChild.offsetHeight;
      p.clientDimensions.scrollWidth = p.clientDimensions.width *
        (lcEnd > p.clientDimensions.height ? 2 : 1);
    }

    p.clientDimensions.pages = Math.ceil(
      p.clientDimensions.scrollWidth / p.clientDimensions.width
    );
    console.log("Pages: "+p.clientDimensions.pages);

    return p.clientDimensions;
  }


  function locateChapters(node) {
    for (var i = 0; i < p.chapters.length; ++i) {
      var chp = p.chapters[i];
      chp.page = 1;
      if (chp.fragment) {
        var target = document.getElementById(chp.fragment);
        while (target && target.parentNode != node) {
          target = target.parentNode;
        }
        if (target) {
          target.scrollIntoView();
          chp.page = (node.parentNode.scrollLeft / p.clientDimensions.width) + 1;
        }
      }
    }
    node.body.scrollLeft = 0;

    return p.chapters;
  }


  // A shortcut to p.clientDimensions.pages.
  //
  function lastPageNumber() {
    return p.clientDimensions ? p.clientDimensions.pages : null;
  }


  API.applyTo = applyTo;
  API.updateDimensions = updateDimensions;
  API.lastPageNumber = lastPageNumber;
  API.prepareNode = prepareNode;
  API.chapterForPage = chapterForPage;
  API.pageForChapter = pageForChapter;

  initialize();

  return API;
}

Monocle.pieceLoaded('component');
