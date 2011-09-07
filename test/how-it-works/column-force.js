function detectForceColumnsWithMinWidth() {
  var kindle = navigator.userAgent.indexOf("Kindle/3");
  var iOS3 = navigator.userAgent.indexOf("iPhone OS 3");
  if (kindle < 0 && iOS3 < 0) { return; }
  console.warn("Column force on all iframes...");
  var frames = document.getElementsByTagName('iframe');
  for (var i = 0, ii = frames.length; i < ii; ++i) {
    frames[i].contentDocument.body.className = "column-force";
  }
}


window.addEventListener("load", detectForceColumnsWithMinWidth, false);
