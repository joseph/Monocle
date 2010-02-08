/* PLACE */

Carlyle.Place = function (node) {

  var component;
  var pageNumber;
  var chapter;

  function setPlace(cmpt, pageN) {
    component = cmpt;
    pageNumber = pageN;
    chapter = null;
  }


  function pageAtPercentageThrough(percent) {
    return Math.ceil(component.pages * percent);
  }


  function percentageThrough() {
    return pageNumber / component.pages;
  }


  function chapterInfo() {
    if (chapter) {
      return chapter;
    }
    return chapter = component.chapterForPage(pageNumber);
  }


  function chapterTitle() {
    return chapterInfo().title;
  }


  var PublicAPI = {
    setPlace: setPlace,
    pageNumber: pageNumber,
    chapterInfo: chapterInfo,
    chapterTitle: chapterTitle,
    component: function () { return component; }
  }

  return PublicAPI;
}
