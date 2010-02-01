/* BOOK */
Carlyle.Book = function (dataSource) {
  if (Carlyle == this) { return new Carlyle.Book(dataSource); }

  var components = dataSource.getComponents();
  var contents = dataSource.getContents();
  var componentData = [];


  // NB: we could also do chunking on the following:
  //
  //  - start of a section
  //  - print media - pagebreak CSS?


  // This method must return the actual page number WITHIN THE COMPONENT that
  // will result from the page being turned to 'pageN'. That is, it constrains
  // and corrects the value of pageN.
  //
  // In this process, it should load a new component if required, any new
  // chunks as required, remove old components or chunks, and whatever other
  // steps are useful to optimise the speed of page turning.
  //
  // The Reader should call this method before turning any pageDiv to a new
  // page number.
  //
  function preparePageFor(contentDiv, pageN, componentId) {

    // The componentId is optional -- if it is not provided (or it is invalid),
    // we default to the currently active component, and if that doesn't exist,
    // we default to the very first component.
    var cIndex = components.indexOf(componentId);
    if (cIndex == -1) {
      if (contentDiv.componentData) {
        cIndex = contentDiv.componentData.componentIndex
      } else {
        cIndex = 0;
      }
    }
    if (
      !contentDiv.componentData ||
      contentDiv.componentData.componentIndex != cIndex
    ) {
      applyComponent(contentDiv, cIndex);
    }

    // If the book is dirty because a resize has occurred, recalculate all
    // pages in the div.
    //
    if (contentDiv.dirty) {
      // Store current location details
      var lpn = contentDiv.lastPageNumber;

      // Recalculate content dimensions & extent & chunks & etc.
      calculatePages(contentDiv);

      // Guess where (approximately) we're up to in the document.
      if (lpn) {
        pageN = Math.floor(contentDiv.lastPageNumber * (pageN / lpn));
        //console.log('Shifting to page ' + pageN);
      } else {
        pageN = 1;
      }

      // All cleaned up!
      contentDiv.dirty = false;
    }

    // Determine whether we need to apply a new component to the div, and
    // adjust the pageN accordingly.
    var cData = contentDiv.componentData;
    var cIndex = cData.componentIndex;
    var lastComponentIndex = components.length - 1;
    if (cIndex == 0 && pageN < 1) {
      // Before first page of book. Disallow.
      return false;
    } else if (cIndex == lastComponentIndex && pageN > cData.lastPageNumber) {
      // After last page of book. Disallow.
      return false;
    } else if (pageN > cData.lastPageNumber) {
      // Moving to next component.
      pageN -= cData.lastPageNumber;
      applyComponent(contentDiv, cIndex + 1);
    } else if (pageN < 1) {
      // Moving to previous component.
      applyComponent(contentDiv, cIndex - 1);
      pageN += contentDiv.componentData.lastPageNumber;
    }

    cData = contentDiv.componentData;
    for (var i = 0; i < cData.chunks.length; ++i) {
      var chunk = cData.chunks[i];
      if (chunk.firstPageNumber - 1 <= pageN) {
        appendChunk(contentDiv, chunk);
      } else {
        detachChunk(contentDiv, chunk);
      }
    }

    return pageN;
  }


  function appendChunk(div, chunk) {
    var elems = div.componentData.elements[div.pageDiv.pageIndex];
    var slice = elems.slice(chunk.firstElementIndex, chunk.lastElementIndex);
    if (slice[0].parentNode == div) { return; }
    Carlyle.log(
      "Appending chunk for client(" + div.pageDiv.pageIndex + "): " +
        chunk.firstElementIndex + " - " + chunk.lastElementIndex +
        " (pp " + chunk.firstPageNumber + " - " + chunk.lastPageNumber + ")"
    );
    addElementsTo(div, slice);
  }

  function detachChunk(div, chunk) {
    var elems = div.componentData.elements[div.pageDiv.pageIndex];
    var slice = elems.slice(chunk.firstElementIndex, chunk.lastElementIndex);
    if (slice[0].parentNode != div) { return; }
    Carlyle.log(
      "Detaching chunk for client(" + div.pageDiv.pageIndex + "): " +
        chunk.firstElementIndex + " - " + chunk.lastElementIndex +
        " (pp " + chunk.firstPageNumber + " - " + chunk.lastPageNumber + ")"
    );
    removeElementsFrom(div, slice);
  }


  function applyComponent(div, componentIndex) {
    // Request the HTML and turn it into elements, if required.
    componentToElements(componentIndex);

    // Assign the component data to the div.
    div.componentData = componentData[componentIndex];

    // Recalculate the statistics on the component inside the div.
    calculatePages(div);
  }


  // Measures the width of all elements in the current component, and creates
  // chunks of elements for every INTERVAL of pages (where INTERVAL may be, eg,
  // 10).
  //
  // Does nothing if parentDimensions are unchanged.
  //
  // Performed when a new component is loaded in, and when the reader area is
  // resized.
  //
  function calculatePages(div) {
    // Figure out the dimensions of the containing (parent) element.
    var newDims = {
      width: div.parentNode.offsetWidth,
      height: div.parentNode.offsetHeight
    }

    // Repopulate div with the entire component.
    // FIXME: Once we have chunking, we should not do this if we do not
    // need to recalculate chunks. Instead, preparePageFor() should naturally
    // apply the correct chunk.
    //
    // So once that is implemented, we'd move this below the recalculation
    // check on parentDimensions.
    removeElementsFrom(div);

    // FIXME: this copy seems a bit haphazard...
    var index = div.pageDiv.pageIndex;
    if (!div.componentData.elements[index]) {
      var elems = div.componentData.elements[index] = [];
      var len = div.componentData.elements[0].length;
      for (var i = 0; i < len; ++i) {
        elems[i] = div.componentData.elements[0][i].cloneNode(true);
      }
    }
    addElementsTo(div, div.componentData.elements[div.pageDiv.pageIndex]);

    // If the dimensions of the parent haven't changed, we have nothing to do.
    var cData = div.componentData;
    if (cData &&
      cData.parentDimensions &&
      cData.parentDimensions.width == newDims.width &&
      cData.parentDimensions.height == newDims.height
    ) {
      removeElementsFrom(div);
      div.lastPageNumber = cData.lastPageNumber;
      return;
    } else {
      cData.parentDimensions = newDims;
    }

    // Now we know how wide the component is...
    newDims.scrollWidth = div.parentNode.scrollWidth;

    // If it appears to be 2 pages long, it may just be one page. We check
    // by making the div too small for multiple columns, then check whether
    // the scrollHeight overflows the offsetHeight.
    //
    // It's messy, but until getClientRects support lands, it's all we got.
    //
    // FIXME: split off into separate method?
    //
    if (newDims.scrollWidth == newDims.width * 2) {
      var lcEnd = div.lastChild.offsetTop + div.lastChild.offsetHeight;
      newDims.scrollWidth = newDims.width * (lcEnd > newDims.height ? 2 : 1);
    }

    // ...from which we can deduce the number of columns (ie, 'pages').
    cData.lastPageNumber = Math.ceil(newDims.scrollWidth / newDims.width);
    div.lastPageNumber = cData.lastPageNumber;

    // Calculating chapters -- FIXME: this could really get a lot neater and
    // simpler. What is the actual data we want to store?
    //
    // FIXME: split off into separate method?
    //
    var partsInComponent = [];
    var recurseParts = function (parts) {
      for (var i = parts.length - 1; i >= 0; --i) {
        var part = parts[i];
        if (part.component == cData.componentId) {
          partsInComponent.push(part);
        }

        if (part.children) {
          recurseParts(part.children);
        }
      }
    }
    recurseParts(contents);

    cData.chapters = [];
    for (var i = partsInComponent.length - 1; i >= 0; --i) {
      var part = partsInComponent[i];
      if (!part.fragment) {
        cData.chapters.push({
          title: part.title,
          page: 1
        });
      } else {
        var target = document.getElementById(part.fragment);
        while (target && target.parentNode != div) {
          target = target.parentNode;
        }
        if (target) {
          target.scrollIntoView();
          cData.chapters.push({
            id: part.fragment,
            title: part.title,
            page: (div.parentNode.scrollLeft / newDims.width) + 1
          });
        }
      }
    }
    div.parentNode.scrollTop = 0;

    // Calculating chunks.
    var elements = cData.elements[div.pageDiv.pageIndex];
    // .. average 1 chunk every 4 pages.
    var chunkSize = Math.ceil(elements.length / (cData.lastPageNumber / 4));
    Carlyle.log("Chunking - elements per chunk: " + chunkSize);
    cData.chunks = [];
    var count = Math.ceil(elements.length / chunkSize);
    Carlyle.log("Chunking - number of chunks: " + count);
    var pagesRemaining = cData.lastPageNumber;
    Carlyle.log("Chunking - number of pages in component: " + pagesRemaining);

    var totalJ = 0;
    for (var i = 0; i < count; ++i) {
      for (var j = 0; j < chunkSize && div.hasChildNodes(); ++j, ++totalJ) {
        div.removeChild(div.firstChild);
      }
      var newPR = Math.floor(div.parentNode.scrollWidth / newDims.width);
      cData.chunks.push({
        firstElementIndex: totalJ - j,
        lastElementIndex: totalJ,
        firstPageNumber: (cData.lastPageNumber - pagesRemaining) + 1,
        lastPageNumber: (cData.lastPageNumber - newPR) + 1
      });
      pagesRemaining = newPR;
    }
    Carlyle.log(cData.chunks)
  }


  // Queries the dataSource for innerHTMl of component, and turns it into
  // elements. These are stored in the componentData array against the
  // zeroth view.
  //
  function componentToElements(n) {
    if (componentData[n] && componentData[n].elements) {
      return componentData[n].elements[0];
    }

    if (n >= components.length) {
      // TODO: gone above the number of components defined in the dataSource?
      console.log("TEMPWARN: gone above number of components in dataSource");
      return;
    }

    var html = dataSource.getComponent(components[n]);
    if (html == null || html == "") {
      // TODO: accessed an empty component?
      console.log("TEMPWARN: accessed an empty component");
      return;
    }

    // Okay, create the component data.
    componentData[n] = componentData[n] || {};
    componentData[n].componentIndex = n;
    componentData[n].componentId = components[n];
    componentData[n].elements = [[]];

    // Populate the zeroth view of elements with the elements from a
    // temporary div. Any top-level text node will be inserted into a fresh
    // div parent before being added to the array -- unless it is blank, in
    // which case it is discarded. (In this way we ensure that all items
    // in the array are Elements.)
    //
    var elementArray = componentData[n].elements[0];
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = html;
    while (tmpDiv.hasChildNodes()) {
      var node = tmpDiv.removeChild(tmpDiv.firstChild);
      if (node.nodeType == 1) {
        elementArray.push(node);
      } else if (node.nodeType == 3 && !node.nodeValue.match(/^\s+$/)) {
        var elem = document.createElement('div');
        elem.appendChild(node)
        elementArray.push(elem);
      }
    }
    delete(tmpDiv);

    return componentData[n].elements[0];
  }


  function addElementsTo(element, elementArray) {
    var len = elementArray.length;
    for (var i = 0; i < len; ++i) {
      element.appendChild(elementArray[i]);
    }
  }


  function removeElementsFrom(element, elementArray) {
    if (elementArray) {
      var len = elementArray.length;
      for (var i = 0; i < len; ++i) {
        element.removeChild(elementArray[i]);
      }
    } else {
      while (element.hasChildNodes()) {
        element.removeChild(element.firstChild);
      }
    }
  }


  var PublicAPI = {
    constructor: Carlyle.Book,
    preparePageFor: preparePageFor,
    getMetaData: dataSource.getMetaData,
    components: components,
    contents: contents
  }

  return PublicAPI;
}



Carlyle.Book.fromHTML = function (html) {
  var bookData = {
    getComponents: function () {
      return ['anonymous'];
    },
    getContents: function () {
      return [];
    },
    getComponent: function (n) {
      return html;
    },
    getMetaData: function (key) {
    }
  }

  return new Carlyle.Book(bookData);
}
