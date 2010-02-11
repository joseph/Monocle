/* PLACE */

Carlyle.Place = function (node) {

  var component;
  var percent;
  var chapter;

  function setPlace(cmpt, pageN) {
    component = cmpt;
    percent = pageN / cmpt.lastPageNumber();
    chapter = null;
  }


  function percentageThrough() {
    return percent;
  }


  function pageAtPercentageThrough(pc) {
    return Math.ceil(component.lastPageNumber() * pc);
  }


  function pageNumber() {
    return pageAtPercentageThrough(percent);
  }


  function chapterInfo() {
    if (chapter) {
      return chapter;
    }
    return chapter = component.chapterForPage(pageNumber());
  }


  function chapterTitle() {
    var chp = chapterInfo();
    return chp ? chp.title : null;
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
