/* FRAMER
 *
 * Loads a reader into a dynamically generated iframe.
 *
 */

Monocle.Framer = function () {
  if (Monocle == this) { return new Monocle.Framer(); }

  var API = { constructor: Monocle.Framer }
  var k = API.constants = API.constructor;
  var p = API.properties = {}

  function initialize() {
  }


  function setBase(href) {
    p.baseHref = href;
  }


  // Creates an iframe, populates it with the barest required HTML (including
  // all specified scripts and stylesheets), and waits for the HTML to load.
  // When it has fully loaded, frameLoaded() will be called to create the actual
  // reader instance.
  //
  function newReader(node, bookData, options) {
    p.node = typeof(node) == "string" ? document.getElementById(node) : node;
    p.readerOptions = options;
    p.bookData = bookData || {
      getComponents: function () { return ['anonymous']; },
      getContents: function () { return []; },
      getComponent: function (n) { return p.originalHTML; },
      getMetaData: function (key) { }
    };
    p.originalHTML = p.node.innerHTML;
    p.node.innerHTML = "";
    p.frame = document.createElement("IFRAME");
    p.frame.src = "javascript: null;";
    p.frame.style.cssText = Monocle.Styles.ruleText('framer');
    p.node.appendChild(p.frame);
    p.cWin = p.frame.contentWindow;
    var html = '<html><head>';
    if (p.baseHref) {
      html += '<base href="'+p.baseHref+'" />';
    }
    for (i = 0; i < k.stylesheets.length; ++i) {
      html += '<link rel="stylesheet" type="text/css" href="' +
        k.stylesheets[i] + '"/>';
    }
    html += '<style type="text/css">'+k.documentStyles+'</style>';
    for (var i = 0; i < k.scripts.length; ++i) {
      html += '<script type="text/javascript" src="'+k.scripts[i]+'"></script>';
    }
    html += '</head><body>' +
      '<div id="rdr"></div>' +
      '<script type="text/javascript">window.framer.frameLoaded();</script>' +
      '</body></html>';

    var doc = p.cWin.document;
    doc.open();
    p.cWin.framer = API;
    doc.write(html);
    doc.close();
  }


  // If all the required libraries are loaded, we can create the reader.
  // Otherwise, we should wait for the libraries. Make sure that
  // k.waitForPiece is set to the final piece you depend on.
  //
  function frameLoaded() {
    if (typeof p.cWin.Monocle != "undefined") {
      p.cWin.reader = p.cWin.Monocle.Reader('rdr', p.bookData, p.readerOptions);
      if (typeof p.cWin.onMonocleReader == "function") {
        p.cWin.onMonocleReader(p.cWin.reader);
      }
    } else {
      p.cWin.onMonoclePiece = function (piece) {
        if (piece == k.waitForPiece) { frameLoaded(); }
      }
    }
  }


  initialize();

  API.setBase = setBase;
  API.newReader = newReader;
  API.frameLoaded = frameLoaded;

  return API;
}

Monocle.Framer.stylesheets = [];
Monocle.Framer.documentStyles =
  "body { margin: 0; padding: 0; border: 0; }" +
  "#rdr { width: 100%; height: 100%; position: absolute; }";
Monocle.Framer.scripts = ["monocle.js"];
Monocle.Framer.waitForPiece = 'monocle';



Monocle.Styles.framer = {
  "width": "100%",
  "height": "100%",
  "border": "0",
  "display": "block"
}

Monocle.pieceLoaded('framer');
