/* BOOK */

/* The Book handles movement through the content by the reader page elements.
 *
 * It's responsible for instantiating components as they are required,
 * and for calculating which component and page number to move to (based on
 * requests from the Reader).
 *
 * It should set and know the place of each page element too.
 *
 */
Monocle.Book = function (dataSource) {
  if (Monocle == this) { return new Monocle.Book(dataSource); }

  var API = { constructor: Monocle.Book }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    dataSource: dataSource,
    components: [],
    chapters: {} // flat arrays of chapters per component
  }


  function initialize() {
    p.componentIds = dataSource.getComponents();
    p.contents = dataSource.getContents();
    p.lastCIndex = p.componentIds.length - 1;
  }


  // Adjusts the given locus object to provide the page number within the
  // current component.
  //
  // If the locus implies movement to another component, the locus
  // 'componentId' property will be updated to point to this component, and
  // the 'load' property will be set to true, which should be taken as a
  // sign to call loadPageAt with a callback.
  //
  // The locus argument is an object that has one of the following properties:
  //
  //  - page: positive integer. Counting up from the start of component.
  //  - pagesBack: negative integer. Counting back from the end of component.
  //  - percent: float
  //  - direction: integer relative to the current page number for this pageDiv
  //  - position: string, one of "start" or "end", moves to corresponding point
  //      in the given component
  //  - anchor: an element id within the component
  //  - xpath: the node at this XPath within the component
  //  - selector: the first node at this CSS selector within the component
  //
  // The locus object can also specify a componentId. If it is not provided
  // we default to the currently active component, and if that doesn't exist,
  // we default to the very first component.
  //
  // The locus result will be an object with the following properties:
  //
  //  - load: boolean, true if loading component required, false otherwise
  //  - componentId: component to load (current componentId if load is false)
  //  - if load is false:
  //    - page
  //  - if load is true:
  //    - one of page / pagesBack / percent / direction / position / anchor
  //
  function pageNumberAt(pageDiv, locus) {
    locus.load = false;
    var currComponent = pageDiv.m.activeFrame ?
      pageDiv.m.activeFrame.m.component :
      null;
    var component = null;
    var cIndex = p.componentIds.indexOf(locus.componentId);
    if (cIndex < 0 && !currComponent) {
      // No specified component, no current component. Load first component.
      locus.load = true;
      locus.componentId = p.componentIds[0];
      return locus;
    } else if (
      cIndex < 0 &&
      locus.componentId &&
      currComponent.properties.id != locus.componentId
    ) {
      // Invalid component, say not found.
      pageDiv.m.reader.dispatchEvent(
        "monocle:notfound",
        { href: locus.componentId }
      );
      return null;
    } else if (cIndex < 0) {
      // No specified (or invalid) component, use current component.
      component = currComponent;
      locus.componentId = pageDiv.m.activeFrame.m.component.properties.id;
      cIndex = p.componentIds.indexOf(locus.componentId);
    } else if (!p.components[cIndex] || p.components[cIndex] != currComponent) {
      // Specified component differs from current component. Load specified.
      locus.load = true;
      return locus;
    } else {
      component = currComponent;
    }

    // If we're here, then the locus is based on the current component.
    var result = { load: false, componentId: locus.componentId, page: 1 }

    // Get the current last page.
    lastPageNum = component.lastPageNumber();

    // Deduce the page number for the given locus.
    if (typeof(locus.page) == "number") {
      result.page = locus.page;
    } else if (typeof(locus.pagesBack) == "number") {
      result.page = lastPageNum + locus.pagesBack;
    } else if (typeof(locus.percent) == "number") {
      var place = new Monocle.Place();
      place.setPlace(component, 1);
      result.page = place.pageAtPercentageThrough(locus.percent);
    } else if (typeof(locus.direction) == "number") {
      if (!pageDiv.m.place) {
        console.warn("Can't move in a direction if pageDiv has no place.");
      }
      result.page = pageDiv.m.place.pageNumber();
      result.page += locus.direction;
    } else if (typeof(locus.anchor) == "string") {
      result.page = component.pageForChapter(locus.anchor, pageDiv);
    } else if (typeof(locus.xpath) == "string") {
      result.page = component.pageForXPath(locus.xpath, pageDiv);
    } else if (typeof(locus.selector) == "string") {
      result.page = component.pageForSelector(locus.selector, pageDiv);
    } else if (typeof(locus.position) == "string") {
      if (locus.position == "start") {
        result.page = 1;
      } else if (locus.position == "end") {
        result.page = lastPageNum['new'];
      }
    } else {
      console.warn("Unrecognised locus: " + locus);
    }

    if (result.page < 1) {
      if (cIndex == 0) {
        // On first page of book.
        result.page = 1;
        result.boundarystart = true;
      } else {
        // Moving backwards from current component.
        result.load = true;
        result.componentId = p.componentIds[cIndex - 1];
        result.pagesBack = result.page;
        result.page = null;
      }
    } else if (result.page > lastPageNum) {
      if (cIndex == p.lastCIndex) {
        // On last page of book.
        result.page = lastPageNum;
        result.boundaryend = true;
      } else {
        // Moving forwards from current component.
        result.load = true;
        result.componentId = p.componentIds[cIndex + 1];
        result.page -= lastPageNum;
      }
    }

    return result;
  }


  // Same as pageNumberAt, but if a load is not flagged, this will
  // automatically update the pageDiv's place to the given pageNumber.
  //
  // If you call this (ie, from a flipper), you are effectively entering into
  // a contract to move the frame offset to the given page returned in the
  // locus if load is false.
  //
  function setPageAt(pageDiv, locus) {
    locus = pageNumberAt(pageDiv, locus);
    if (locus && !locus.load) {
      var evtData = { locus: locus, page: pageDiv }
      if (locus.boundarystart) {
        pageDiv.m.reader.dispatchEvent('monocle:boundarystart', evtData);
      } else if (locus.boundaryend) {
        pageDiv.m.reader.dispatchEvent('monocle:boundaryend', evtData);
      } else {
        var component = p.components[p.componentIds.indexOf(locus.componentId)];
        pageDiv.m.place = pageDiv.m.place || new Monocle.Place();
        pageDiv.m.place.setPlace(component, locus.page);

        var evtData = {
          page: pageDiv,
          locus: locus,
          pageNumber: pageDiv.m.place.pageNumber(),
          componentId: locus.componentId
        }
        pageDiv.m.reader.dispatchEvent("monocle:pagechange", evtData);
      }
    }
    return locus;
  }


  // Will load the given component into the pageDiv's frame, then invoke the
  // callback with resulting locus (provided by pageNumberAt).
  //
  // If the resulting page number is outside the bounds of the new component,
  // (ie, pageNumberAt again requests a load), this will recurse into further
  // components until non-loading locus is returned by pageNumberAt. Then the
  // callback will fire with that locus.
  //
  // As with setPageAt, if you call this you're obliged to move the frame
  // offset to the given page in the locus passed to the callback.
  //
  // If you pass a function as the progressCallback argument, the logic of this
  // function will be in your control. The function will be invoked between:
  //
  // a) loading the component and
  // b) applying the component to the frame and
  // c) loading any further components if required
  //
  // with a function argument that performs the next step in the process. So
  // if you need to do some special handling during the load process, you can.
  //
  function loadPageAt(pageDiv, locus, callback, progressCallback) {
    var cIndex = p.componentIds.indexOf(locus.componentId);
    if (!locus.load || cIndex < 0) {
      locus = pageNumberAt(pageDiv, locus);
    }

    if (!locus) {
      return;
    }

    if (!locus.load) {
      callback(locus);
      return;
    }

    var findPageNumber = function () {
      locus = setPageAt(pageDiv, locus);
      if (!locus) {
        return;
      } else if (locus.load) {
        loadPageAt(pageDiv, locus, callback, progressCallback)
      } else {
        callback(locus);
      }
    }

    var pgFindPageNumber = function () {
      progressCallback ? progressCallback(findPageNumber) : findPageNumber();
    }

    var applyComponent = function (component) {
      component.applyTo(pageDiv, pgFindPageNumber);
    }

    var pgApplyComponent = function (component) {
      progressCallback ?
        progressCallback(function () { applyComponent(component) }) :
        applyComponent(component);
    }

    loadComponent(cIndex, pgApplyComponent, pageDiv);
  }


  // If your flipper doesn't care whether a component needs to be
  // loaded before the page can be set, you can use this shortcut.
  //
  function setOrLoadPageAt(pageDiv, locus, callback, onProgress, onFail) {
    locus = setPageAt(pageDiv, locus);
    if (!locus) {
      if (onFail) { onFail(); }
    } else if (locus.load) {
      loadPageAt(pageDiv, locus, callback, onProgress);
    } else {
      callback(locus);
    }
  }


  // Fetches the component source from the dataSource.
  //
  // 'index' is the index of the component in the
  // dataSource.getComponents array.
  //
  // 'callback' is invoked when the source is received.
  //
  // 'pageDiv' is optional, and simply allows firing events on
  // the reader object that has requested this component, ONLY if
  // the source has not already been received.
  //
  function loadComponent(index, callback, pageDiv) {
    if (p.components[index]) {
      return callback(p.components[index]);
    }
    var cmptId = p.componentIds[index];
    if (pageDiv) {
      var evtData = { 'page': pageDiv, 'component': cmptId, 'index': index };
      pageDiv.m.reader.dispatchEvent('monocle:componentloading', evtData);
    }
    var failedToLoadComponent = function () {
      console.warn("Failed to load component: "+cmptId);
      pageDiv.m.reader.dispatchEvent('monocle:componentfailed', evtData);
      try {
        var currCmpt = pageDiv.m.activeFrame.m.component;
        evtData.cmptId = currCmpt.properties.id;
        callback(currCmpt);
      } catch (e) {
        console.warn("Failed to fall back to previous component.");
      }
    }

    var fn = function (cmptSource) {
      if (cmptSource === false) { return failedToLoadComponent(); }
      if (pageDiv) {
        evtData['source'] = cmptSource;
        pageDiv.m.reader.dispatchEvent('monocle:componentloaded', evtData);
        html = evtData['html'];
      }
      p.components[index] = new Monocle.Component(
        API,
        cmptId,
        index,
        chaptersForComponent(cmptId),
        cmptSource
      );
      callback(p.components[index]);
    }
    var cmptSource = p.dataSource.getComponent(cmptId, fn);
    if (cmptSource && !p.components[index]) {
      fn(cmptSource);
    } else if (cmptSource === false) {
      return failedToLoadComponent();
    }
  }


  // Returns an array of chapter objects that are found in the given component.
  //
  // A chapter object has this format:
  //
  //    {
  //      title: "Chapter 1",
  //      fragment: null
  //    }
  //
  // The fragment property of a chapter object is either null (the chapter
  // starts at the head of the component) or the fragment part of the URL
  // (eg, "foo" in "index.html#foo").
  //
  function chaptersForComponent(cmptId) {
    if (p.chapters[cmptId]) {
      return p.chapters[cmptId];
    }
    p.chapters[cmptId] = [];
    var matcher = new RegExp('^'+cmptId+"(\#(.+)|$)");
    var matches;
    var recurser = function (chp) {
      if (matches = chp.src.match(matcher)) {
        p.chapters[cmptId].push({
          title: chp.title,
          fragment: matches[2] || null
        });
      }
      if (chp.children) {
        for (var i = 0; i < chp.children.length; ++i) {
          recurser(chp.children[i]);
        }
      }
    }

    for (var i = 0; i < p.contents.length; ++i) {
      recurser(p.contents[i]);
    }
    return p.chapters[cmptId];
  }


  // Returns a locus for the chapter that has the URL given in the
  // 'src' argument.
  //
  // See the comments at pageNumberAt for an explanation of locus objects.
  //
  function locusOfChapter(src) {
    var matcher = new RegExp('^(.+?)(#(.*))?$');
    var matches = src.match(matcher);
    if (!matches) { return null; }
    var cmptId = componentIdMatching(matches[1]);
    if (!cmptId) { return null; }
    var locus = { componentId: cmptId }
    matches[3] ? locus.anchor = matches[3] : locus.position = "start";
    return locus;
  }


  function isValidLocus(locus) {
    if (!locus) { return false; }
    if (locus.componentId && !componentIdMatching(locus.componentId)) {
      return false;
    }
    return true;
  }


  function componentIdMatching(str) {
    return p.componentIds.indexOf(str) >= 0 ? str : null;
  }


  API.getMetaData = dataSource.getMetaData;
  API.pageNumberAt = pageNumberAt;
  API.setPageAt = setPageAt;
  API.loadPageAt = loadPageAt;
  API.setOrLoadPageAt = setOrLoadPageAt;
  API.chaptersForComponent = chaptersForComponent;
  API.locusOfChapter = locusOfChapter;
  API.isValidLocus = isValidLocus;

  initialize();

  return API;
}


// A shortcut for creating a book from an array of nodes.
//
// You could use this as follows, for eg:
//
//  Monocle.Book.fromNodes([document.getElementById('content')]);
//
Monocle.Book.fromNodes = function (nodes) {
  var bookData = {
    getComponents: function () {
      return ['anonymous'];
    },
    getContents: function () {
      return [];
    },
    getComponent: function (n) {
      return { 'nodes': nodes };
    },
    getMetaData: function (key) {
    }
  }

  return new Monocle.Book(bookData);
}

Monocle.pieceLoaded('core/book');
