/* FRAMER
 *
 * Loads a reader into a dynamically generated iframe.
 *
 */

Monocle.Framer = function (node, bookData, options) {
  if (Monocle == this) { return new Monocle.Framer(node, bookData, options); }

  var k = {
    scripts: [
      "../../src/monocle.js",
      "../../src/compat.js",
      "../../src/reader.js",
      "../../src/book.js",
      "../../src/component.js",
      "../../src/place.js",
      "../../src/styles.js",
      "../../src/flippers/slider.js"
    ]
  }

  var p = {
  }

  var API = {
    constructor: Monocle.Framer,
    properties: p,
    constants: k
  }


  function initialize(node, bookData, options) {
    node = typeof(node) == "string" ? document.getElementById(node) : node;
    p.frame = document.createElement("IFRAME");
    p.frame.src = "javascript: false;";
    p.frame.style.cssText = "width: 100%; height: 100%; " +
      "border: none; display: block;";
    node.appendChild(p.frame);
    p.frame.MonocleFramer = API;
    p.cWin = p.frame.contentWindow;
    var html = '<html><head>';
    for (var i = 0; i < k.scripts.length; ++i) {
      html += '<script type="text/javascript" src="'+k.scripts[i]+'"></script>';
    }
    html += '<script>Monocle.addListener(window, "load", function () { window.parent.framer.loaded() });</script>';
    html += '<style>body { margin: 0; padding: 0; } #reader { width: 100%; height: 100%; }</style>';
    html += '</head><body><div id="reader">...</div></body></html>';

    window.framer = API;
    doc = p.cWin.document;
    doc.open();
    doc.write(html);
    doc.close();
  }


  function loaded() {
    p.cWin.reader = p.cWin.Monocle.Reader('reader', bookData);
  }


  initialize(node, bookData, options);

  API.loaded = loaded;

  return API;
}
