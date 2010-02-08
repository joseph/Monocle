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

  var components = [];
  var places = [];

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
    var place = placeFor(contentDiv) ||
      setPlaceFor(contentDiv, componentAt(0), 1);

    // The componentId is optional -- if it is not provided (or it is invalid),
    // we default to the currently active component, and if that doesn't exist,
    // we default to the very first component.
    var cIndex = dataSource.getComponents().indexOf(componentId);
    var component;
    if (cIndex == -1) {
      component = place.component();
    } else {
      component = componentAt(cIndex);
    }

    if (component != place.component()) {
      component.applyTo(contentDiv);
    }

    // If the dimensions of the node have changed, we should multiply the
    // pageN against the difference between the old number of pages in the
    // component and the new number of pages in the component.
    //
    var oldCmptLPN = component.lastPageNumber();
    var changedDims = component.updateDimensions(contentDiv);
    if (changedDims && parseInt(oldCmptLPN)) {
      pageN = Math.floor(component.lastPageNumber() * (pageN / oldCmptLPN));
    }

    // Determine whether we need to apply a new component to the div, and
    // adjust the pageN accordingly.
    cIndex = component.index;
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
      return preparePageFor(contentDiv, pageN, component.id);
    } else if (pageN < 1) {
      // Moving to previous component.
      component = componentAt(cIndex - 1);
      pageN += component.lastPageNumber();
      return preparePageFor(contentDiv, pageN, component.id);
    }

    component.prepareNode(contentDiv, pageN)
    setPlaceFor(contentDiv, component, pageN);

    return pageN;
  }


  function placeFor(contentDiv) {
    for (var i = places.length - 1; i >= 0; --i) {
      if (places[i][0] == contentDiv) {
        return places[i][1];
      }
    }
    return null;
  }


  function setPlaceFor(contentDiv, component, pageN) {
    var place = placeFor(contentDiv);
    if (!place) {
      place = new Carlyle.Place(contentDiv);
      places[places.length] = [contentDiv, place];
    }
    place.setPlace(component, pageN);
    return place;
  }


  function componentAt(index) {
    if (!components[index]) {
      name = dataSource.getComponents()[index];
      html = dataSource.getComponent(name);
      components[index] = new Carlyle.Component(
        PublicAPI,
        name,
        index,
        {}, // TODO
        html
      )
    }
    return components[index];
  }


  var PublicAPI = {
    constructor: Carlyle.Book,
    preparePageFor: preparePageFor,
    getMetaData: dataSource.getMetaData,
    placeFor: placeFor
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
