Carlyle.Controls.Contents = function (reader) {
  if (Carlyle.Controls == this) {
    return new Carlyle.Controls.Contents(reader);
  }

  var k = {
  }

  var p = {
    divs: []
  }

  var API = {
    constructor: Carlyle.Controls.Contents,
    constants: k,
    properties: p
  }


  function initialize() {
    p.reader = reader;
  }


  function createControlElements() {
    var div = document.createElement('div');
    p.divs.push(div);
    // TODO: STYLE DIV
    div.style.background = "#F0F";
    contentsForBook(div, reader.getBook());
    return div;
  }


  function contentsForBook(div, book) {
    div.innerHTML = ''; // FIXME
    var list = document.createElement('ul');
    div.appendChild(list);
    // TODO: STYLE LIST

    // FIXME: don't circumvent the book!
    var contents = book.properties.dataSource.getContents();
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
    // FIXME: register the event properly.
    li.addEventListener(
      'click',
      function () {
        alert('click');
        p.reader.skipToChapter(chp.src);
        p.reader.hideControl(API);
      },
      false
    );
    list.appendChild(li);
    if (chp.children) {
      for (var i = 0; i < chp.children.length; ++i) {
        chapterBuilder(chp.children[i], padLvl + 1);
      }
    }
  }


  API.createControlElements = createControlElements;

  initialize();

  return API;
}
