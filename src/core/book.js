/* BOOK */

/* The Book handles movement through the content by the reader page elements.
 *
 * It's responsible for instantiating components as they are required,
 * and for calculating which component and page number to move to (based on
 * requests from the Reader).
 *
 */
Monocle.Book = function (dataSource, preloadWindow) {

  var API = { constructor: Monocle.Book }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    dataSource: dataSource,
    preloadWindow: preloadWindow,
    cmptLoadQueue: {},
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
  //  - percent: float indicating percentage through the component
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
    var lastPageNum = component.lastPageNumber();

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
      if (cIndex === 0) {
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

        evtData = {
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
  function loadPageAt(pageDiv, locus, onLoad, onFail) {
    var cIndex = p.componentIds.indexOf(locus.componentId);
    if (!locus.load || cIndex < 0) {
      locus = pageNumberAt(pageDiv, locus);
    }

    if (!locus) {
      return onFail ? onFail() : null;
    }

    if (!locus.load) {
      return onLoad(locus);
    }

    var findPageNumber = function () {
      locus = setPageAt(pageDiv, locus);
      if (!locus) {
        return onFail ? onFail() : null;
      } else if (locus.load) {
        loadPageAt(pageDiv, locus, onLoad, onFail)
      } else {
        onLoad(locus);
      }
    }

    var applyComponent = function (component) {
      component.applyTo(pageDiv, findPageNumber);
      for (var l = 1; l <= p.preloadWindow; ++l) {
        deferredPreloadComponent(cIndex+l, l*k.PRELOAD_INTERVAL);
      }
    }

    loadComponent(cIndex, applyComponent, onFail, pageDiv);
  }


  // If your flipper doesn't care whether a component needs to be
  // loaded before the page can be set, you can use this shortcut.
  //
  function setOrLoadPageAt(pageDiv, locus, onLoad, onFail) {
    locus = setPageAt(pageDiv, locus);
    if (!locus) {
      if (onFail) { onFail(); }
    } else if (locus.load) {
      loadPageAt(pageDiv, locus, onLoad, onFail);
    } else {
      onLoad(locus);
    }
  }


  // Fetches the component source from the dataSource.
  //
  // 'index' is the index of the component in the
  // dataSource.getComponents array.
  //
  // 'onLoad' is invoked when the source is received.
  //
  // 'onFail' is optional, and is invoked if the source could not be fetched.
  //
  // 'pageDiv' is optional, and simply allows firing events on
  // the reader object that has requested this component, ONLY if
  // the source has not already been received.
  //
  function loadComponent(index, onLoad, onFail, pageDiv) {
    if (p.components[index]) {
      return onLoad(p.components[index]);
    }

    var cmptId = p.components[index];
    var evtData = { 'page': pageDiv, 'component': cmptId, 'index': index };
    pageDiv.m.reader.dispatchEvent('monocle:componentloading', evtData);

    var onCmptLoad = function (cmpt) {
      evtData['component'] = cmpt;
      pageDiv.m.reader.dispatchEvent('monocle:componentloaded', evtData);
      onLoad(cmpt);
    }

    var onCmptFail = function (cmptId) {
      console.warn("Failed to load component: "+cmptId);
      pageDiv.m.reader.dispatchEvent('monocle:componentfailed', evtData);
      if (onFail) { onFail(); }
    }

    _loadComponent(index, onCmptLoad, onCmptFail);
  }


  function preloadComponent(index) {
    if (p.components[index]) { return; }
    var cmptId = p.componentIds[index];
    if (!cmptId) { return; }
    if (p.cmptLoadQueue[cmptId]) { return; }
    _loadComponent(index);
  }


  function deferredPreloadComponent(index, delay) {
    Monocle.defer(function () { preloadComponent(index); }, delay);
  }


  function _loadComponent(index, successCallback, failureCallback) {
    var cmptId = p.componentIds[index];
    var queueItem = { success: successCallback, failure: failureCallback };
    if (p.cmptLoadQueue[cmptId]) {
      return p.cmptLoadQueue[cmptId] = queueItem;
    } else {
      p.cmptLoadQueue[cmptId] = queueItem;
    }

    var onCmptFail = function () {
      fireLoadQueue(cmptId, 'failure', cmptId);
    }

    var onCmptLoad = function (cmptSource) {
      if (cmptSource === false) { return onCmptFail(); }
      p.components[index] = new Monocle.Component(
        API,
        cmptId,
        index,
        chaptersForComponent(cmptId),
        cmptSource
      );
      fireLoadQueue(cmptId, 'success', p.components[index]);
    }

    var cmptSource = p.dataSource.getComponent(cmptId, onCmptLoad);
    if (cmptSource && !p.components[index]) {
      onCmptLoad(cmptSource);
    } else if (cmptSource === false) {
      onCmptFail();
    }
  }


  function fireLoadQueue(cmptId, cbName, args) {
    if (typeof p.cmptLoadQueue[cmptId][cbName] == 'function') {
      p.cmptLoadQueue[cmptId][cbName](args);
    }
    p.cmptLoadQueue[cmptId] = null;
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
    var matcher = new RegExp('^'+decodeURIComponent(cmptId)+"(\#(.+)|$)");
    var matches;
    var recurser = function (chp) {
      if (matches = decodeURIComponent(chp.src).match(matcher)) {
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
    str = decodeURIComponent(str);
    for (var i = 0, ii = p.componentIds.length; i < ii; ++i) {
      if (decodeURIComponent(p.componentIds[i]) == str) { return str; }
    }
    return null;
  }


  function componentWeights() {
    if (!p.weights) {
      p.weights = dataSource.getMetaData('componentWeights') || [];
      if (!p.weights.length) {
        var cmptSize = 1.0 / p.componentIds.length;
        for (var i = 0, ii = p.componentIds.length; i < ii; ++i) {
          p.weights.push(cmptSize);
        }
      }
    }
    return p.weights;
  }


  API.getMetaData = dataSource.getMetaData;
  API.pageNumberAt = pageNumberAt;
  API.setPageAt = setPageAt;
  API.loadPageAt = loadPageAt;
  API.setOrLoadPageAt = setOrLoadPageAt;
  API.chaptersForComponent = chaptersForComponent;
  API.locusOfChapter = locusOfChapter;
  API.isValidLocus = isValidLocus;
  API.componentWeights = componentWeights;

  initialize();

  return API;
}


// Legacy function. Deprecated.
//
Monocle.Book.fromNodes = function (nodes) {
  console.deprecation("Book.fromNodes() will soon be removed.");
  return new Monocle.Book(Monocle.bookDataFromNodes(nodes));
}

Monocle.Book.PRELOAD_INTERVAL = 1000;
