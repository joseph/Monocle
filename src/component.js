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

    // An array of chunk objects, that split up an elements array into more
    // manageable slices. A chunk object is defined as:
    //  {
    //    firstElementIndex: n,
    //    lastElementIndex: n,
    //    firstPageNumber: n,
    //    lastPageNumber: n
    //  }
    //
    //  This data is invalidated by dimensional changes in the reader, because
    //  the page numbers may change.
    //
    chunks: [],

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

    // Populate the zeroth view of elements with the elements from a
    // temporary div. Any top-level text node will be inserted into a fresh
    // div parent before being added to the array -- unless it is blank, in
    // which case it is discarded. (In this way we ensure that all items
    // in the array are Elements.)
    //
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = p.html;
    while (tmpDiv.hasChildNodes()) {
      var node = tmpDiv.removeChild(tmpDiv.firstChild);
      if (node.nodeType == 1) {
        elems.push(node);
      } else if (node.nodeType == 3 && !node.nodeValue.match(/^\s+$/)) {
        var elem = document.createElement('div');
        elem.appendChild(node)
        elems.push(elem);
      }
    }
    delete(tmpDiv);
  }


  function nodeIndex(node) {
    return p.clientNodes.indexOf(node);
  }


  function prepareNode(node, pageN) {
    for (var i = 0; i < p.chunks.length; ++i) {
      if (p.chunks[i].firstPageNumber - 1 <= pageN) {
        appendChunk(node, p.chunks[i]);
      } else {
        detachChunk(node, p.chunks[i]);
      }
    }
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


  function appendChunk(node, chunk) {
    var slice = p.elementsForClient[nodeIndex(node)].slice(
      chunk.firstElementIndex,
      chunk.lastElementIndex
    );

    if (slice[0].parentNode == node) {
      return;
    }

    addElementsTo(node, slice);
  }


  function detachChunk(node, chunk) {
    var slice = p.elementsForClient[nodeIndex(node)].slice(
      chunk.firstElementIndex,
      chunk.lastElementIndex
    );

    if (slice[0].parentNode != node) {
      return;
    }

    removeElementsFrom(node, slice);
  }


  function applyTo(node) {
    registerClient(node);
    removeElementsFrom(node);
  }


  function updateDimensions(node) {
    registerClient(node);

    if (haveDimensionsChanged(node)) {
      removeElementsFrom(node);
      addElementsTo(node, p.elementsForClient[nodeIndex(node)]);
      //positionImages(node);
      measureDimensions(node);
      locateChapters(node);
      //tmpLocateOcclusions(node);
      primeChunks(node);

      // Remove elements from all client nodes, because they'll need to
      // be re-applied with the new chunks.
      for (var i = 0; i < p.clientNodes.length; ++i) {
        removeElementsFrom(p.clientNodes[i]);
      }

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

    if (!p.elementsForClient[nodeIndex(node)]) {
      var sourceElems = p.elementsForClient[0];
      var destElems = p.elementsForClient[nodeIndex(node)] = [];
      var len = sourceElems.length;
      for (var i = 0; i < len; ++i) {
        destElems[i] = sourceElems[i].cloneNode(true);
      }
    }
  }


  // Returns true or false.
  function haveDimensionsChanged(node) {
    return (!p.clientDimensions) ||
      (p.clientDimensions.width != node.parentNode.offsetWidth) ||
      (p.clientDimensions.height != node.parentNode.offsetHeight) ||
      (p.clientDimensions.fontSize != node.style.fontSize);
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
      width: node.parentNode.offsetWidth,
      height: node.parentNode.offsetHeight,
      scrollWidth: node.parentNode.scrollWidth,
      fontSize: node.style.fontSize
    }

    if (p.clientDimensions.scrollWidth == p.clientDimensions.width * 2) {
      var lcEnd = node.lastChild.offsetTop + node.lastChild.offsetHeight;
      p.clientDimensions.scrollWidth = p.clientDimensions.width *
        (lcEnd > p.clientDimensions.height ? 2 : 1);
    }

    p.clientDimensions.pages = Math.ceil(
      p.clientDimensions.scrollWidth / p.clientDimensions.width
    );

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
    node.parentNode.scrollLeft = 0;

    return p.chapters;
  }


  // Just a test method for finding "occlusions" — which here means elements
  // that appear at the top of a column. These can be used to do special
  // occluded chunking — where past chunks can be *removed* from the element
  // without appearing to reflow the content. This means less is being scrolled,
  // and slower devices are better able to 3d-render the overPage.
  //
  function tmpLocateOcclusions(node) {
    if (!node.getBoundingClientRect) {
      console.log('Occlusion not supported');
      return;
    } else {
      console.log('Locating occlusions');
    }

    var topElems = [];
    var cRect = node.getBoundingClientRect();
    for (var i = 0; i < node.childNodes.length; ++i) {
      var elem = node.childNodes[i];
      var prevElem = node.childNodes[i - 1];
      if (!prevElem) {
        topElems.push(elem);
      } else {
        var nRect = elem.getBoundingClientRect();
        var pRect = prevElem.getBoundingClientRect();
        if (pRect.bottom <= cRect.bottom && nRect.top <= pRect.top) {
          topElems.push(elem);
        }
      }
      elem.style.color = "#000"; // FOR DEBUGGING
    }

    for (i = 0; i < topElems.length; ++i) {
      topElems[i].style.color = "#F0F"; // FOR DEBUGGING
    }
  }


  // NB: we could also do chunking on the following:
  //
  //  - occlusions
  //  - start of a section
  //  - print media - pagebreak CSS?
  //
  function primeChunks(node) {
    p.chunks = [];
    var elements = p.elementsForClient[nodeIndex(node)];
    // .. average 1 chunk every 4 pages.
    var pagesRemaining = p.clientDimensions.pages;
    var chunkSize = Math.ceil(elements.length / (pagesRemaining / 4));
    var chunkCount = Math.ceil(elements.length / chunkSize);

    var elemCount = 0;
    for (var i = 0; i < chunkCount; ++i) {
      for (var j = 0; j < chunkSize && node.hasChildNodes(); ++j, ++elemCount) {
        node.removeChild(node.firstChild);
      }
      var newPagesRemaining = Math.floor(
        node.parentNode.scrollWidth / p.clientDimensions.width
      );
      p.chunks.push({
        firstElementIndex: elemCount - j,
        lastElementIndex: elemCount,
        firstPageNumber: (p.clientDimensions.pages - pagesRemaining) + 1,
        lastPageNumber: (p.clientDimensions.pages - newPagesRemaining) + 1
      });
      pagesRemaining = newPagesRemaining;
    }

    return p.chunks;
  }


  function addElementsTo(node, elementArray) {
    var len = elementArray.length;
    for (var i = 0; i < len; ++i) {
      node.appendChild(elementArray[i]);
    }
    return len;
  }


  function removeElementsFrom(node, elementArray) {
    var len;
    if (elementArray) {
      len = elementArray.length;
      for (var i = 0; i < len; ++i) {
        if (elementArray[i].parentNode == node) {
          node.removeChild(elementArray[i]);
        }
      }
      return len;
    }

    len = node.childNodes.length;
    while (node.hasChildNodes()) {
      node.removeChild(node.firstChild);
    }
    return len;
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
