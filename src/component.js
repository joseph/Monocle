/* COMPONENT */

/* Arguments:
 *
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


Carlyle.Component = function (id, index, chapters, html) {
  if (Carlyle == this) { return new Carlyle.Book(dataSource); }

  // A back-reference to the book that owns this component.
  // FIXME: how does this work with PublicAPI?
  var book;

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


  // Called by book.preparePageFor - checks that the node is registered.
  //
  // If the node has different dimensions, it will be recalculated using
  // this node.
  //
  function prepareNode(node, pageN) {
    clean(node);

    for (var i = 0; i < chunks.length; ++i) {
      if (chunks[i].firstPageNumber - 1 <= pageN) {
        appendChunk(node, chunks[i]);
      } else {
        detachChunk(node, chunks[i]);
      }
    }
  }


  function appendChunk(node, chunk) {
    var slice = elementsForClient(
      chunk.firstElementIndex,
      chunk.lastElementIndex
    );

    if (slice[0].parentNode == node) {
      return;
    }

    Carlyle.log(
      "Appending chunk for client (" + nodeIndex(node) + "): " +
        chunk.firstElementIndex + " - " + chunk.lastElementIndex +
        " (pp " + chunk.firstPageNumber + " - " + chunk.lastPageNumber + ")"
    );

    addElementsTo(node, slice);
  }


  function detachChunk(node, chunk) {
    var slice = elementsForClient(
      chunk.firstElementIndex,
      chunk.lastElementIndex
    );

    if (slice[0].parentNode == node) {
      return;
    }

    Carlyle.log(
      "Detaching chunk for client (" + nodeIndex(node) + "): " +
        chunk.firstElementIndex + " - " + chunk.lastElementIndex +
        " (pp " + chunk.firstPageNumber + " - " + chunk.lastPageNumber + ")"
    );

    removeElementsFrom(node, slice);
  }


  function clean(node) {
    if (nodeIndex(node) == -1) {
      registerClient(node);
    }

    if (haveDimensionsChanged(node)) {
      removeElementsFrom(node);
      addElementsTo(node, elementsForClient[nodeIndex(node)]);
      measureDimensions(node);
      locateChapters(node);
      primeChunks(node);
      removeElementsFrom(node);
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
      (clientDimensions.height != node.parentNode.offsetHeight);
  }


  function measureDimensions(node) {
    clientDimensions = {
      width: node.parentNode.offsetWidth,
      height: node.parentNode.offsetHeight,
      scrollWidth: node.parentNode.scrollWidth
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


  function primeChunks(node) {
    chunks = [];
    var elements = elementsForClient[nodeIndex(node)];
    // .. average 1 chunk every 4 pages.
    var pagesRemaining = clientDimensions.pages;
    Carlyle.log("Chunking " + id + " - number of pages: " + pagesRemaining);
    var chunkSize = Math.ceil(elements.length / (pagesRemaining / 4));
    Carlyle.log("Chunking " + id + " - elements per chunk: " + chunkSize);
    var chunkCount = Math.ceil(elements.length / chunkSize);
    Carlyle.log("Chunking " + id + " - number of chunks: " + chunkCount);

    var elemCount = 0;
    for (var i = 0; i < count; ++i) {
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
    Carlyle.log(chunks);

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
        element.removeChild(elementArray[i]);
      }
      return len;
    }

    len = element.childNodes.length;
    while (element.hasChildNodes()) {
      element.removeChild(element.firstChild);
    }
    return len;
  }


  var PublicAPI = {
    id: id,
    index: index,
    lastPageNumber: lastPageNumber,
    prepareNode: prepareNode
  }


  initialize();

  return PublicAPI;
}
