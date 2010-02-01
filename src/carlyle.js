Carlyle = {};

Carlyle.DEBUG = true;

Carlyle.log = function (msg) {
  if (Carlyle.DEBUG) { console.log(msg); }
}


// FIXME: this function just naively grabs the file sequentially and blocks
// until the file has been loaded. Since it doesn't do parallel downloads,
// everything must wait for it to complete.
//
Carlyle.require = function (path) {
  var ajReq = new XMLHttpRequest();
  ajReq.open("GET", path, false);
  ajReq.send(null);
  eval(ajReq.responseText);
  // var scriptNode = document.createElement('script');
  // scriptNode.setAttribute('src', path);
  // scriptNode.setAttribute('type', "text/javascript");
  // document.getElementsByTagName('head')[0].appendChild(scriptNode);
}

Carlyle.require('/src/reader.js');
Carlyle.require('/src/book.js');
Carlyle.require('/src/component.js');
Carlyle.require('/src/styles.js');
