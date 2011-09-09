function detectForceColumnsWithMinWidth() {
  var frames = document.getElementsByTagName('iframe');
  for (var i = 0, ii = frames.length; i < ii; ++i) {
    var pn = frames[i].parentNode;
    var bd = frames[i].contentDocument.body;
    if (bd.scrollHeight > pn.offsetHeight) {
      console.warn("Column force on iframe ["+i+"]");
      bd.className = "column-force";
    }
  }
}


window.addEventListener("load", detectForceColumnsWithMinWidth, false);
