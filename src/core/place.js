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
    if (k.PAGE_ANCHOR == 'bottom') {
      return p.percent - 1.0 / p.component.lastPageNumber();
    } else {
      return p.percent;
    }
  }


  function percentOnPage() {
    return percentAtTopOfPage() + k.PAGE_ANCHOR_OFFSET / pagesInComponent();
  }


  // How far we are through the component at the "bottom of the page".
  //
  function percentAtBottomOfPage() {
    if (k.PAGE_ANCHOR == 'bottom') {
      return p.percent;
    } else {
      return p.percent + 1.0 / p.component.lastPageNumber();
    }
  }


  // The page number at a given point (0: start, 1: end) within the component.
  //
  function pageAtPercentageThrough(percent) {
    var pages = pagesInComponent();
    if (typeof percent != 'number') { percent = 0; }
    return Math.max(Math.round(pages * percent), 1);
  }


  // The page number of this point within the component.
  //
  function pageNumber() {
    return pageAtPercentageThrough(p.percent);
  }


  function pagesInComponent() {
    return p.component.lastPageNumber();
  }


  function chapterInfo() {
    if (p.chapter) {
      return p.chapter;
    }
    return p.chapter = p.component.chapterForPage(pageNumber()+1);
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
    var book = p.component.properties.book;
    var componentIds = book.properties.componentIds;
    var weights = book.componentWeights();
    var cmptIndex = p.component.properties.index;
    var pc = weights[cmptIndex] * p.percent;
    for (var i = 0, ii = cmptIndex; i < ii; ++i) { pc += weights[i]; }

    // Note: This is a decent estimation of current page number and total
    // number of pages, but it's very approximate. Could be improved by storing
    // the page counts of all components accessed (since the dimensions of the
    // reader last changed), and averaging the result across them. (You
    // probably want to ignore calcs for components < 2 or 3 pages long, too.
    // The bigger the component, the more accurate the calculation.)
    //
    // var bkPages = p.component.lastPageNumber() / weights[cmptIndex];
    // console.log('Page: '+ Math.floor(pc*bkPages)+ ' of '+ Math.floor(bkPages));

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
  API.percentOnPage = percentOnPage;
  API.percentAtBottomOfPage = percentAtBottomOfPage;
  API.pageAtPercentageThrough = pageAtPercentageThrough;
  API.pageNumber = pageNumber;
  API.pagesInComponent = pagesInComponent;
  API.chapterInfo = chapterInfo;
  API.chapterTitle = chapterTitle;
  API.chapterSrc = chapterSrc;
  API.getLocus = getLocus;
  API.percentageOfBook = percentageOfBook;
  API.onFirstPageOfBook = onFirstPageOfBook;
  API.onLastPageOfBook = onLastPageOfBook;

  API.percentageThrough = k.PAGE_ANCHOR == 'bottom' ? percentAtBottomOfPage :
    k.PAGE_ANCHOR == 'offset' ? percentOnPage :
    percentAtTopOfPage;

  return API;
}


// Can set this to 'top', 'offset' or 'bottom'. Old Monocle behaviour is 'bottom'.
//
Monocle.Place.PAGE_ANCHOR = 'offset';
Monocle.Place.PAGE_ANCHOR_OFFSET = 0.1;


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
  var book = reader.getBook();
  var componentIds = book.properties.componentIds;
  var weights = book.componentWeights();
  var cmptIndex = 0, cmptWeight = 0;
  percent = Math.min(percent, 0.99999);
  while (percent >= 0) {
    cmptWeight = weights[cmptIndex];
    percent -= weights[cmptIndex];
    if (percent >= 0) {
      cmptIndex += 1;
      if (cmptIndex >= weights.length) {
        console.error('Unable to calculate locus from percentage: '+percent);
        return;
      }
    }
  }
  var cmptPercent = (percent + cmptWeight) / cmptWeight;
  return { componentId: componentIds[cmptIndex], percent: cmptPercent }
}
