Monocle.Controls.Contents = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Contents(reader);
  }

  var k = {
    CHAPTER_INVOKE_EVENT: 'click'
  }

  var p = {
    divs: []
  }

  var API = {
    constructor: Monocle.Controls.Contents,
    constants: k,
    properties: p
  }


  function initialize() {
    p.reader = reader;
  }


  function createControlElements() {
    var div = document.createElement('div');
    p.divs.push(div);
    div.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Contents.container
    );
    contentsForBook(div, reader.getBook());
    return div;
  }


  function contentsForBook(div, book) {
    while (div.hasChildNodes()) {
      div.removeChild(div.firstChild);
    }
    var list = document.createElement('ol');
    div.appendChild(list);
    list.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Contents.list
    );

    var contents = book.chapterTree();
    for (var i = 0; i < contents.length; ++i) {
      chapterBuilder(list, contents[i], 0);
    }
  }


  function chapterBuilder(list, chp, padLvl) {
    var li = document.createElement('li');
    var span = document.createElement('span');
    span.style.paddingLeft = padLvl + "em";
    span.innerHTML = chp.title;
    li.appendChild(span);
    Monocle.addListener(
      li,
      k.CHAPTER_INVOKE_EVENT,
      function () {
        p.reader.skipToChapter(chp.src);
        p.reader.hideControl(API);
      }
    );
    li.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Contents.chapter
    );
    list.appendChild(li);
    if (chp.children) {
      for (var i = 0; i < chp.children.length; ++i) {
        chapterBuilder(list, chp.children[i], padLvl + 1);
      }
    }
  }


  API.createControlElements = createControlElements;

  initialize();

  return API;
}


Monocle.Styles.Controls.Contents = {
  container: {
    "position": "absolute",
    "width": "75%",
    "height": "75%",
    "left": "12.5%",
    "top": "12.5%",
    "background": "#EEE",
    "border": "2px solid #F7F7F7",
    "overflow-y": "auto",
    "border-radius": "9px",
    "-moz-border-radius": "9px",
    "-webkit-border-radius": "9px",
    "box-shadow": "1px 2px 6px rgba(0,0,0,0.5)",
    "-moz-box-shadow": "1px 2px 6px rgba(0,0,0,0.5)",
    "-webkit-box-shadow": "1px 2px 6px rgba(0,0,0,0.5)"
  },
  list: {
    "margin": "6px",
    "padding": "0"
  },
  chapter: {
    "list-style": "none",
    "line-height": "220%",
    "padding-left": "1em",
    "padding-right": "2em",
    "border-bottom": "2px groove #FEFEFE",
    "cursor": "pointer"
  }
}
