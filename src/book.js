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
Carlyle.Book = function (dataSource) {
  if (Carlyle == this) { return new Carlyle.Book(dataSource); }

  // Constants
  var k = {
  }

  // Properties.
  var p = {
    components: [],
    places: []
  }

  // Methods and properties available to external code.
  var API = {
    constructor: Carlyle.Book,
    constants: k,
    properties: p
  }


  // This method must return the actual page number WITHIN THE COMPONENT that
  // will result from the page being turned to 'pageN'. That is, it constrains
  // and corrects the value of pageN.
  //
  // In this process, it should load a new component if required. It should
  // recurse if pageN overflows the first or last pages of the given component.
  //
  // The `componentId` is optional -- if it is not provided (or it is invalid),
  // we default to the currently active component, and if that doesn't exist,
  // we default to the very first component.
  //
  function changePage(node, pageN, componentId) {
    // Find the place of the node in the book, or create one.
    var place = placeFor(node) || setPlaceFor(node, componentAt(0), 1);

    var cIndex = dataSource.getComponents().indexOf(componentId);
    var component;
    if (cIndex == -1) {
      component = place.properties.component;
    } else {
      component = componentAt(cIndex);
    }

    if (component != place.properties.component) {
      component.applyTo(node);
    }

    // If the dimensions of the node have changed, we should multiply the
    // pageN against the difference between the old number of pages in the
    // component and the new number of pages in the component.
    //
    var oldCmptLPN = component.lastPageNumber();
    var changedDims = component.updateDimensions(node);
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
    var finalCIndex = dataSource.getComponents().length - 1; // FIXME: cache it
    if (cIndex == 0 && pageN < 1) {
      // Before first page of book. Disallow.
      return false;
    } else if (cIndex == finalCIndex && pageN > component.lastPageNumber()) {
      // After last page of book. Disallow.
      return false;
    } else if (pageN > component.lastPageNumber()) {
      // Moving to next component.
      pageN -= component.lastPageNumber();
      component = componentAt(cIndex + 1);
      return changePage(node, pageN, component.properties.id);
    } else if (pageN < 1) {
      // Moving to previous component.
      component = componentAt(cIndex - 1);
      component.updateDimensions(node); // FIXME: no going back
      pageN += component.lastPageNumber();
      return changePage(node, pageN, component.properties.id);
    }

    // Do it.
    component.prepareNode(node, pageN)
    var scroller = node.parentNode;
    scroller.scrollLeft = (pageN - 1) * scroller.offsetWidth;
    setPlaceFor(node, component, pageN);

    return pageN;
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
      place = new Carlyle.Place(node);
      p.places[p.places.length] = [node, place];
    }
    place.setPlace(component, pageN);
    return place;
  }


  function componentAt(index) {
    if (!p.components[index]) {
      var src = dataSource.getComponents()[index];
      var html = dataSource.getComponent(src);
      p.components[index] = new Carlyle.Component(
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
    var chapters = [];
    var matcher = new RegExp('^'+src+"(\#(.+)|$)");
    var matches;
    var recurser = function (chp) {
      if (matches = chp.src.match(matcher)) {
        chapters.push({
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

    var sourceData = dataSource.getContents();
    for (var i = 0; i < sourceData.length; ++i) {
      recurser(sourceData[i]);
    }
    return chapters;
  }


  function placeOfChapter(node, src) {
    var matcher = new RegExp('^(.+?)(#(.*))?$');
    var matches = src.match(matcher);
    if (matches) {
      var cmptId = matches[1];
      var fragment = matches[3] || null;
      var cIndex = dataSource.getComponents().indexOf(cmptId);
      var component = componentAt(cIndex);
      component.updateDimensions(node); // FIXME: means no-going-back
      var place = new Carlyle.Place(node);
      if (fragment) {
        console.log("Looking for fragment '"+fragment+"' in '"+cmptId+"'");
        place.setPlace(component, component.pageForChapter(fragment));
      } else {
        console.log("Looking for start of '"+cmptId+"'");
        place.setPlace(component, 1);
      }
      return place;
    }
    return null;
  }


  API.getMetaData = dataSource.getMetaData;
  API.changePage = changePage;
  API.placeFor = placeFor;
  API.placeOfChapter = placeOfChapter;

  return API;
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
