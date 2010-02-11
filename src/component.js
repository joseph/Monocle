/* COMPONENT */

/* Arguments:
 *
 *  book: a back-reference to PublicAPI of the book that owns this component
 *  id: the string that represents this component in the book's component array
 *  index: the position in the book's components array of this component
 *  chapters: (see below)
 *  html: the HTML provided by dataSource.getComponent() for this component
 *
 **/

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


Carlyle.Component = function (book, id, index, chapters, html) {
  if (Carlyle == this) { return new Carlyle.Book(dataSource); }

  // An array of elements that will hold the elements of this component.
  //
  var clientNodes = [];

  // An array of arrays of HTML elements -- one for each client node.
  // Accessed as: elementsForClient[node.index][n]
  //
  var elementsForClient = [];

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
  var chunks = [];

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
  //     pages: n             // number of pages in this component
  //   }
  //
  // Obviously, this data is invalidated by dimensional changes in the reader.
  //
  var clientDimensions;


  function initialize() {
    if (!html) {
      console.log("WARNING: accessed an empty component.");
      return;
    }

    var elems = elementsForClient[0] = [];

    // Populate the zeroth view of elements with the elements from a
    // temporary div. Any top-level text node will be inserted into a fresh
    // div parent before being added to the array -- unless it is blank, in
    // which case it is discarded. (In this way we ensure that all items
    // in the array are Elements.)
    //
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = html;
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
    return clientNodes.indexOf(node);
  }


  function prepareNode(node, pageN) {
    for (var i = 0; i < chunks.length; ++i) {
      if (chunks[i].firstPageNumber - 1 <= pageN) {
        appendChunk(node, chunks[i]);
      } else {
        detachChunk(node, chunks[i]);
      }
    }
  }


  function chapterForPage(pageN) {
    var cand = null;
    for (var i = 0; i < chapters.length; ++i) {
      if (pageN >= chapters[i].page) {
        cand = chapters[i];
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
    for (var i = 0; i < chapters.length; ++i) {
      if (chapters[i].fragment == fragment) {
        return chapters[i].page;
      }
    }
    return null;
  }


  function appendChunk(node, chunk) {
    var slice = elementsForClient[nodeIndex(node)].slice(
      chunk.firstElementIndex,
      chunk.lastElementIndex
    );

    if (slice[0].parentNode == node) {
      return;
    }

    console.log(
      "Appending chunk for client (" + nodeIndex(node) + "): " +
        chunk.firstElementIndex + " - " + chunk.lastElementIndex +
        " (pp " + chunk.firstPageNumber + " - " + chunk.lastPageNumber + ")"
    );

    addElementsTo(node, slice);
  }


  function detachChunk(node, chunk) {
    var slice = elementsForClient[nodeIndex(node)].slice(
      chunk.firstElementIndex,
      chunk.lastElementIndex
    );

    if (slice[0].parentNode != node) {
      return;
    }

    console.log(
      "Detaching chunk for client (" + nodeIndex(node) + "): " +
        chunk.firstElementIndex + " - " + chunk.lastElementIndex +
        " (pp " + chunk.firstPageNumber + " - " + chunk.lastPageNumber + ")"
    );

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
      addElementsTo(node, elementsForClient[nodeIndex(node)]);
      positionImages(node);
      measureDimensions(node);
      locateChapters(node);
      //tmpLocateOcclusions(node);
      primeChunks(node);

      // Remove elements from all client nodes, because they'll need to
      // be re-applied with the new chunks.
      for (var i = 0; i < clientNodes.length; ++i) {
        removeElementsFrom(clientNodes[i]);
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
    clientNodes.push(node);

    if (!elementsForClient[nodeIndex(node)]) {
      var sourceElems = elementsForClient[0];
      var destElems = elementsForClient[nodeIndex(node)] = [];
      var len = sourceElems.length;
      for (var i = 0; i < len; ++i) {
        destElems[i] = sourceElems[i].cloneNode(true);
      }
    }
  }


  // Returns true or false.
  function haveDimensionsChanged(node) {
    return (!clientDimensions) ||
      (clientDimensions.width != node.parentNode.offsetWidth) ||
      (clientDimensions.height != node.parentNode.offsetHeight) ||
      (clientDimensions.fontSize != node.style.fontSize);
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
        imgs[i].style.marginTop = (cRect.height - (iRect.top - cRect.top)) + "px";
        console.log("Image offset by: " + imgs[i].style.marginTop);
      }
    }
  }


  function measureDimensions(node) {
    clientDimensions = {
      width: node.parentNode.offsetWidth,
      height: node.parentNode.offsetHeight,
      scrollWidth: node.parentNode.scrollWidth,
      fontSize: node.style.fontSize
    }

    if (clientDimensions.scrollWidth == clientDimensions.width * 2) {
      var lcEnd = node.lastChild.offsetTop + node.lastChild.offsetHeight;
      clientDimensions.scrollWidth = clientDimensions.width *
        (lcEnd > clientDimensions.height ? 2 : 1);
    }

    clientDimensions.pages = Math.ceil(
      clientDimensions.scrollWidth / clientDimensions.width
    );

    return clientDimensions;
  }


  function locateChapters(node) {
    for (var i = 0; i < chapters.length; ++i) {
      var chp = chapters[i];
      chp.page = 1;
      if (chp.fragment) {
        var target = document.getElementById(chp.fragment);
        while (target && target.parentNode != node) {
          target = target.parentNode;
        }
        if (target) {
          target.scrollIntoView();
          chp.page = (node.parentNode.scrollLeft / clientDimensions.width) + 1;
        }
      }
    }

    return chapters;
  }


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


  function primeChunks(node) {
    chunks = [];
    var elements = elementsForClient[nodeIndex(node)];
    // .. average 1 chunk every 4 pages.
    var pagesRemaining = clientDimensions.pages;
    console.log("Chunking " + id + " - number of pages: " + pagesRemaining);
    var chunkSize = Math.ceil(elements.length / (pagesRemaining / 4));
    console.log("Chunking " + id + " - elements per chunk: " + chunkSize);
    var chunkCount = Math.ceil(elements.length / chunkSize);
    console.log("Chunking " + id + " - number of chunks: " + chunkCount);

    var elemCount = 0;
    for (var i = 0; i < chunkCount; ++i) {
      for (var j = 0; j < chunkSize && node.hasChildNodes(); ++j, ++elemCount) {
        node.removeChild(node.firstChild);
      }
      var newPagesRemaining = Math.floor(
        node.parentNode.scrollWidth / clientDimensions.width
      );
      chunks.push({
        firstElementIndex: elemCount - j,
        lastElementIndex: elemCount,
        firstPageNumber: (clientDimensions.pages - pagesRemaining) + 1,
        lastPageNumber: (clientDimensions.pages - newPagesRemaining) + 1
      });
      pagesRemaining = newPagesRemaining;
    }

    return chunks;
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


  var PublicAPI = {
    id: id,
    index: index,
    lastPageNumber: function () { return clientDimensions ? clientDimensions.pages : null }, // FIXME: messy!
    applyTo: applyTo,
    updateDimensions: updateDimensions,
    prepareNode: prepareNode,
    chapterForPage: chapterForPage,
    pageForChapter: pageForChapter
  }


  initialize();

  return PublicAPI;
}
