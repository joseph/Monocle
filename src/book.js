/* BOOK */

/* The Book handles movement through the content by the reader page elements.
 *
 * It's responsible for instantiating components as they are required,
 * and for calculating which component and page number to move to (based on
 * requests from the Reader).
 *
 * It should set and know the place of each page node too.
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
    places: [],
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


  // This method must return the actual page number WITHIN THE COMPONENT that
  // will result from the page being turned to 'pageN'. That is, it constrains
  // and corrects the value of pageN.
  //
  // In this process, it should load a new component if required. It should
  // recurse if pageN overflows the first or last pages of the given component.
  //
  // The locus argument is required, and is an object that responds to one of:
  //
  //  - page: integer
  //  - percent: float
  //  - direction: integer relative to the current page number for this node
  //  - position: string, one of "start" or "end", moves to corresponding point
  //      in the given component
  //
  // The locus object can also specify a componentId. If it is not provided
  // (or it is invalid), we default to the currently active component, and
  // if that doesn't exist, we default to the very first component.
  //
  function changePage(node, locus) {
    // Find the place of the node in the book, or create one.
    var place = placeFor(node) || setPlaceFor(node, componentAt(0), 1);

    var cIndex = p.componentIds.indexOf(locus.componentId);
    var component;
    if (cIndex == -1) {
      component = place.properties.component;
    } else {
      component = componentAt(cIndex);
    }

    if (component != place.properties.component) {
      component.applyTo(node);
    }

    var oldCmptLPN = component.lastPageNumber();
    var changedDims = component.updateDimensions(node);

    // Now that the component has been activated within the node, we can
    // deduce the page number for the given locus.
    var pageN = 1;
    if (typeof(locus.page) == "number") {
      pageN = locus.page;
    } else if (typeof(locus.percent) == "number") {
      place = setPlaceFor(node, component, 1);
      pageN = place.pageAtPercentageThrough(locus.percent);
    } else if (typeof(locus.direction) == "number") {
      pageN = place.pageNumber();
      pageN += locus.direction;
    } else if (typeof(locus.anchor) == "string") {
      if (locus.position == "start") {
        pageN = 1;
      } else if (locus.position == "end") {
        pageN = component.lastPageNumber();
      }
    } else {
      console.log("Unrecognised locus: " + locus);
    }

    // If the dimensions of the node have changed, we should multiply the
    // pageN against the difference between the old number of pages in the
    // component and the new number of pages in the component.
    if (changedDims && parseInt(oldCmptLPN)) {
      pageN = Math.max(
        Math.round(component.lastPageNumber() * (pageN / oldCmptLPN)),
        1
      );
    }

    // Determine whether we need to apply a new component to the div, and
    // adjust the pageN accordingly.
    cIndex = component.properties.index;
    var lpn = component.lastPageNumber();
    if (cIndex == 0 && pageN < 1) {
      // Before first page of book. Disallow.
      return false;
    } else if (cIndex == p.lastCIndex && pageN > component.lastPageNumber()) {
      // After last page of book. Disallow.
      return false;
    } else if (pageN > component.lastPageNumber()) {
      // Moving to next component.
      pageN -= component.lastPageNumber();
      component = componentAt(cIndex + 1);
      return changePage(
        node,
        { page: pageN, componentId: component.properties.id }
      );
    } else if (pageN < 1) {
      // Moving to previous component.
      component = componentAt(cIndex - 1);
      // NB: as soon as we update the dimensions, we've changed the page state.
      component.updateDimensions(node);
      pageN += component.lastPageNumber();
      return changePage(
        node,
        { page: pageN, componentId: component.properties.id }
      );
    }

    // Do it.
    component.prepareNode(node, pageN)
    setPlaceFor(node, component, pageN);

    return {
      componentId: component.properties.id,
      page: pageN,
      offset: (pageN - 1) * node.parentNode.offsetWidth
    }
  }


  function placeFor(node) {
    for (var i = p.places.length - 1; i >= 0; --i) {
      if (p.places[i][0] == node) {
        return p.places[i][1];
      }
    }
    return null;
  }


  function setPlaceFor(node, component, pageN) {
    var place = placeFor(node);
    if (!place) {
      place = new Monocle.Place();
      p.places[p.places.length] = [node, place];
    }
    place.setPlace(component, pageN);
    return place;
  }


  function componentAt(index) {
    if (!p.components[index]) {
      var src = p.componentIds[index];
      var html = p.dataSource.getComponent(src);
      p.components[index] = new Monocle.Component(
        API,
        src,
        index,
        chaptersForComponent(src),
        html
      );
    }
    return p.components[index];
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


  function placeOfChapter(node, src) {
    var matcher = new RegExp('^(.+?)(#(.*))?$');
    var matches = src.match(matcher);
    if (matches) {
      var cmptId = matches[1];
      var fragment = matches[3] || null;
      var cIndex = p.componentIds.indexOf(cmptId);
      var component = componentAt(cIndex);
      // NB: updating dimensions changes page state.
      component.updateDimensions(node);
      var place = new Monocle.Place(node);
      if (fragment) {
        place.setPlace(component, component.pageForChapter(fragment));
      } else {
        place.setPlace(component, 1);
      }
      return place;
    }
    return null;
  }


  function chapterTree() {
    return p.contents;
  }


  API.getMetaData = dataSource.getMetaData;
  API.changePage = changePage;
  API.chapterTree = chapterTree;
  API.chaptersForComponent = chaptersForComponent;
  API.placeFor = placeFor;
  API.placeOfChapter = placeOfChapter;

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
