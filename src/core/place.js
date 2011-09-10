// PLACE

Monocle.Place = function () {

  var API = { constructor: Monocle.Place }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    component: null,
    percent: null
  }


  function setPlace(cmpt, pageN) {
    p.component = cmpt;
    p.percent = pageN / cmpt.lastPageNumber();
    p.chapter = null;
  }


  function setPercentageThrough(cmpt, percent) {
    p.component = cmpt;
    p.percent = percent;
    p.chapter = null;
  }


  function componentId() {
    return p.component.properties.id;
  }


  // How far we are through the component at the "top of the page".
  //
  // 0 - start of book. 1.0 - end of book.
  //
  function percentAtTopOfPage() {
    return p.percent - 1.0 / p.component.lastPageNumber();
  }


  // How far we are through the component at the "bottom of the page".
  //
  // NB: API aliases this to percentageThrough().
  //
  function percentAtBottomOfPage() {
    return p.percent;
  }


  // The page number at a given point (0: start, 1: end) within the component.
  //
  function pageAtPercentageThrough(percent) {
    return Math.max(Math.round(p.component.lastPageNumber() * percent), 1);
  }


  // The page number of this point within the component.
  //
  function pageNumber() {
    return pageAtPercentageThrough(p.percent);
  }


  function chapterInfo() {
    if (p.chapter) {
      return p.chapter;
    }
    return p.chapter = p.component.chapterForPage(pageNumber());
  }


  function chapterTitle() {
    var chp = chapterInfo();
    return chp ? chp.title : null;
  }


  function chapterSrc() {
    var src = componentId();
    var cinfo = chapterInfo();
    if (cinfo && cinfo.fragment) {
      src += "#" + cinfo.fragment;
    }
    return src;
  }


  function getLocus(options) {
    options = options || {};
    var locus = {
      page: pageNumber(),
      componentId: componentId()
    }
    if (options.direction) {
      locus.page += options.direction;
    } else {
      locus.percent = percentAtBottomOfPage();
    }
    return locus;
  }


  // Returns how far this place is in the entire book (0 - start, 1.0 - end).
  //
  function percentageOfBook() {
    componentIds = p.component.properties.book.properties.componentIds;
    componentSize = 1.0 / componentIds.length;
    var pc = componentIds.indexOf(componentId()) * componentSize;
    pc += componentSize * p.percent;
    return pc;
  }


  function onFirstPageOfBook() {
    return p.component.properties.index == 0 && pageNumber() == 1;
  }


  function onLastPageOfBook() {
    return (
      p.component.properties.index ==
        p.component.properties.book.properties.lastCIndex &&
      pageNumber() == p.component.lastPageNumber()
    );
  }


  API.setPlace = setPlace;
  API.setPercentageThrough = setPercentageThrough;
  API.componentId = componentId;
  API.percentAtTopOfPage = percentAtTopOfPage;
  API.percentAtBottomOfPage = percentAtBottomOfPage;
  API.percentageThrough = percentAtBottomOfPage;
  API.pageAtPercentageThrough = pageAtPercentageThrough;
  API.pageNumber = pageNumber;
  API.chapterInfo = chapterInfo;
  API.chapterTitle = chapterTitle;
  API.chapterSrc = chapterSrc;
  API.getLocus = getLocus;
  API.percentageOfBook = percentageOfBook;
  API.onFirstPageOfBook = onFirstPageOfBook;
  API.onLastPageOfBook = onLastPageOfBook;

  return API;
}


Monocle.Place.FromPageNumber = function (component, pageNumber) {
  var place = new Monocle.Place();
  place.setPlace(component, pageNumber);
  return place;
}


Monocle.Place.FromPercentageThrough = function (component, percent) {
  var place = new Monocle.Place();
  place.setPercentageThrough(component, percent);
  return place;
}


// We can't create a place from a percentage of the book, because the
// component may not have been loaded yet. But we can get a locus.
//
Monocle.Place.percentOfBookToLocus = function (reader, percent) {
  var componentIds = reader.getBook().properties.componentIds;
  var componentSize = 1.0 / componentIds.length;
  return {
    componentId: componentIds[Math.floor(percent / componentSize)],
    percent: (percent % componentSize) / componentSize
  }
}

Monocle.pieceLoaded('core/place');
