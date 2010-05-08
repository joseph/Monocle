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

  // Constants
  var k = {
  }

  // Properties.
  var p = {
    dataSource: dataSource,
    components: [],
    chapters: {} // flat arrays of chapters per component
  }

  // Methods and properties available to external code.
  var API = {
    constructor: Monocle.Book,
    constants: k,
    properties: p
  }


  function initialize() {
    p.componentIds = dataSource.getComponents();
    p.contents = dataSource.getContents();
    p.lastCIndex = p.componentIds.length - 1;
  }


  // This method must call the callback with the pixel offset that
  // will result from the page being turned to 'pageN'.
  //
  // In this process, it should load a new component if required. It should
  // recurse if pageN overflows the first or last pages of the given component.
  //
  // The locus argument is required, and is an object that responds to
  // componentId and one of:
  //
  //  - page: integer
  //  - percent: float
  //  - direction: integer relative to the current page number for this pageDiv
  //  - position: string, one of "start" or "end", moves to corresponding point
  //      in the given component
  //  - anchor: an element id within the component
  //
  // The locus object can also specify a componentId. If it is not provided
  // (or it is invalid), we default to the currently active component, and
  // if that doesn't exist, we default to the very first component.
  //
  function changePage(pageDiv, locus, callback) {
    switchToComponent(
      pageDiv,
      locus,
      function () {
        var pageN = locusToPage(pageDiv, locus);
        switchToPage(pageDiv, pageN, callback);
      }
    );
  }


  function switchToComponent(pageDiv, locus, callback) {
    // Find the place of the pageDiv in the book, or create one.
    var place = pageDiv.m.place;
    if (!place) {
      loadComponent(
        0,
        function (component) {
          setPlaceFor(pageDiv, component, 1);
          switchToComponent(pageDiv, locus, callback);
        },
        pageDiv
      );
      return;
    }

    var cIndex = p.componentIds.indexOf(locus.componentId);
    var component;
    if (cIndex == -1 || cIndex == place.properties.component.index) {
      component = place.properties.component;
    } else if (p.components[cIndex]) {
      component = p.components[cIndex];
    } else {
      loadComponent(
        cIndex,
        function (component) {
          switchToComponent(pageDiv, locus, callback);
        },
        pageDiv
      );
      return;
    }

    if (component.currentlyApplyingTo(pageDiv)) {
      callback();
    } else {
      component.applyTo(pageDiv, callback);
      // TODO: If we're applying a component, let's load it's next and previous.
    }
  }


  function locusToPage(pageDiv, locus) {
    var component = pageDiv.m.activeFrame.m.component;
    var oldCmptLPN = component.lastPageNumber();
    var changedDims = component.updateDimensions(pageDiv);

    // Now that the component has been activated within the pageDiv, we can
    // deduce the page number for the given locus.
    var pageN = 1;
    if (typeof(locus.page) == "number") {
      pageN = locus.page;
    } else if (typeof(locus.percent) == "number") {
      place = setPlaceFor(pageDiv, component, 1);
      pageN = place.pageAtPercentageThrough(locus.percent);
    } else if (typeof(locus.direction) == "number") {
      pageN = pageDiv.m.place.pageNumber();
      pageN += locus.direction;
    } else if (typeof(locus.anchor) == "string") {
      pageN = component.pageForChapter(locus.anchor);
    } else if (typeof(locus.position) == "string") {
      if (locus.position == "start") {
        pageN = 1;
      } else if (locus.position == "end") {
        pageN = component.lastPageNumber();
      }
    } else {
      console.log("Unrecognised locus: " + locus);
    }

    // If the dimensions of the pageDiv have changed, we should multiply the
    // pageN against the difference between the old number of pages in the
    // component and the new number of pages in the component.
    if (changedDims && parseInt(oldCmptLPN)) {
      pageN = Math.round(component.lastPageNumber() * (pageN / oldCmptLPN));
    }

    return pageN;
  }


  function switchToPage(pageDiv, pageN, callback) {
    var component = pageDiv.m.activeFrame.m.component;

    // Determine whether we need to apply a new component to the div, and
    // adjust the pageN accordingly.
    var cIndex = component.properties.index;
    var lpn = component.lastPageNumber();
    if (cIndex == 0 && pageN < 1) {
      // Before first page of book. Disallow.
      callback(false);
      return false;
    } else if (cIndex == p.lastCIndex && pageN > component.lastPageNumber()) {
      // After last page of book. Disallow.
      callback(false);
      return false;
    } else if (pageN > component.lastPageNumber()) {
      // Moving to next component.
      pageN -= component.lastPageNumber();
      return loadComponent(
        cIndex + 1,
        function (component) {
          changePage(
            pageDiv,
            { page: pageN, componentId: component.properties.id },
            callback
          );
        },
        pageDiv
      );
    } else if (pageN < 1) {
      // Moving to previous component.
      return loadComponent(
        cIndex - 1,
        function (component) {
          component.applyTo(
            pageDiv,
            function () {
              pageN += component.lastPageNumber();
              changePage(
                pageDiv,
                { page: pageN, componentId: component.properties.id },
                callback
              );
            }
          );
        },
        pageDiv
      );
    }

    // Do it.
    setPlaceFor(pageDiv, component, pageN);

    callback({
      componentId: component.properties.id,
      page: pageN,
      offset: (pageN - 1) * pageDiv.m.sheafDiv.clientWidth
    });
  }


  function setPlaceFor(pageDiv, component, pageN) {
    pageDiv.m.place = pageDiv.m.place || new Monocle.Place();
    pageDiv.m.place.setPlace(component, pageN);
    return pageDiv.m.place;
  }


  // Fetches the component HTML from the dataSource. The index argument is
  // the index of the component in the dataSource.getComponents array.
  // Callback is invoked when the HTML is received. pageDiv is optional,
  // and simply allows communication with the reader object that has requested
  // this component, ONLY if the HTML has not already been received.
  //
  function loadComponent(index, callback, pageDiv) {
    if (p.components[index]) {
      return callback(p.components[index]);
    }
    if (pageDiv) {
      var evtData = { 'page': pageDiv, 'component': src, 'index': index };
      pageDiv.m.reader.dispatchEvent('monocle:componentloading', evtData);
    }
    var src = p.componentIds[index];
    var fn = function (html) {
      if (pageDiv) {
        evtData['html'] = html;
        pageDiv.m.reader.dispatchEvent('monocle:componentloaded', evtData);
        html = evtData['html'];
      }
      p.components[index] = new Monocle.Component(
        API,
        src,
        index,
        chaptersForComponent(src),
        html
      );
      callback(p.components[index]);
    }
    var html = p.dataSource.getComponent(src, fn);
    if (html && !p.components[index]) {
      fn(html);
    }
  }


  function chaptersForComponent(src) {
    if (p.chapters[src]) {
      return p.chapters[src];
    }
    p.chapters[src] = [];
    var matcher = new RegExp('^'+src+"(\#(.+)|$)");
    var matches;
    var recurser = function (chp) {
      if (matches = chp.src.match(matcher)) {
        p.chapters[src].push({
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
    return p.chapters[src];
  }


  function locusOfChapter(src) {
    var matcher = new RegExp('^(.+?)(#(.*))?$');
    var matches = src.match(matcher);
    if (!matches) {
      return null;
    }
    var locus = { componentId: matches[1] }
    matches[3] ? locus.anchor = matches[3] : locus.position = "start";
    return locus;
  }


  function chapterTree() {
    return p.contents;
  }


  API.getMetaData = dataSource.getMetaData;
  API.changePage = changePage;
  API.chapterTree = chapterTree;
  API.chaptersForComponent = chaptersForComponent;
  API.locusOfChapter = locusOfChapter;

  initialize();

  return API;
}


Monocle.Book.fromHTML = function (html) {
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

  return new Monocle.Book(bookData);
}

Monocle.pieceLoaded('book');
