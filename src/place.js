/* PLACE */

Carlyle.Place = function () {
  if (Carlyle == this) { return new Carlyle.Place(); }

  // Constants.
  var k = {
  }

  // Properties.
  var p = {
    component: null,
    percent: null
  }

  // Methods and properties available to external code.
  var API = {
    constructor: Carlyle.Place,
    constants: k,
    properties: p
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


  function percentageThrough() {
    return p.percent;
  }


  function pageAtPercentageThrough(pc) {
    return Math.round(p.component.lastPageNumber() * pc);
  }


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


  function getLocus(options) {
    options = options || {};
    var locus = {
      page: pageNumber(),
      componentId: componentId()
    }
    if (options.direction) {
      locus.page += options.direction;
    }
    return locus;
  }


  API.setPlace = setPlace;
  API.setPercentageThrough = setPercentageThrough;
  API.componentId = componentId;
  API.percentageThrough = percentageThrough;
  API.pageAtPercentageThrough = pageAtPercentageThrough;
  API.pageNumber = pageNumber;
  API.chapterInfo = chapterInfo;
  API.chapterTitle = chapterTitle;
  API.getLocus = getLocus;

  return API;
}


Carlyle.Place.FromPageNumber = function (component, pageNumber) {
  var place = new Carlyle.Place();
  place.setPlace(component, pageNumber);
  return place;
}

Carlyle.Place.FromPercentageThrough = function (component, percent) {
  var place = new Carlyle.Place();
  place.setPercentageThrough(component, percent);
  return place;
}
