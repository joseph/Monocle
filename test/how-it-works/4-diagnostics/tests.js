var tests = [

  ["columnsSupported", function (cb) {
    var gps = document.createElement('div').style;
    var supported = (
      gps["columnWidth"] !== undefined ||
      gps["MozColumnWidth"] !== undefined ||
      gps["webkitColumnWidth"] !== undefined ||
      gps["OColumnWidth"] !== undefined ||
      gps["msColumnWidth"] !== undefined
    );
    supported ?
      cb("Columns supported", "green") :
      cb("Columns NOT SUPPORTED", "red");
  }],


  ["iframeContentWidth", function (cb) {
    loadTestFrame(function (fr) {
      var sw = fr.contentDocument.documentElement.scrollWidth;
      var origin = "documentElement";
      if (fr.contentDocument.documentElement.scrollHeight == 0) {
        sw = fr.contentDocument.body.scrollWidth;
        origin = "body";
      }
      if (sw > fr.parentNode.offsetWidth) {
        cb("Width from "+origin+": "+sw, "green");
      } else {
        cb("Width INCORRECT from "+origin+": "+sw, "red");
      }
    });
  }],


  ["columnsRequireMinWidth", function (cb) {
    loadTestFrame(function (fr) {
      var bdy = fr.contentDocument.body;
      if (!bdy.className) {
        cb("MinWidth not required", "green");
      } else if (bdy.className == "column-force") {
        cb("MinWidth REQUIRED", "orange");
      } else {
        cb("MinWidth FAILED TO FORCE COLUMNS: "+bdy.className, "red");
      }
    });
  }],


  ["translateAffectsScrollWidth", function (cb) {
    loadTestFrame(function (fr) {
      var oldWidth = bodyDimensions(fr).width;
      var s = fr.contentDocument.body.style;
      s.transform = "translateX(-600px)";
      s.webkitTransform = "translate3d(-600px, 0, 0)";
      s.MozTransform = s.transform;
      s.OTransform = s.transform;
      var newWidth = bodyDimensions(fr).width;
      var diff = "("+oldWidth+"=>"+newWidth+")";
      if (oldWidth == newWidth + 600) {
        cb("Translation subtracts from scrollWidth: "+diff, "green");
      } else if (oldWidth == newWidth) {
        cb("Translation DOES NOT CHANGE scrollWidth: "+diff, "orange");
      } else {
        cb("Translation changes scrollWidth, but unexpectedly "+diff, "red");
      }
    })
  }],


  ["measuresFourPages", function (cb) { measuresNPages(4, cb); }],


  ["measuresThreePages", function (cb) { measuresNPages(3, cb); }],


  ["measuresTwoPages", function (cb) { measuresNPages(2, cb); }],


  ["measuresOnePage", function (cb) { measuresNPages(1, cb); }]
];


function measuresNPages(n, cb) {
  loadTestFrame(function (fr) {
    var ew = fr.parentNode.offsetWidth * n;
    var aw = bodyDimensions(fr).width;
    cb("Expected "+ew+", actual "+aw, aw == ew ? "green" : "red");
  }, n);
}


function runNextTest() {
  var test = tests.shift();
  if (!test) { return; }
  var name = test[0], fn = test[1];
  var div = document.getElementById("out-"+name);
  if (div) { div.innerHTML = "Checking..."; }
  fn(function (msg, color) {
    if (div) {
      div.innerHTML = msg;
      div.style.color = color;
    }
    var box = document.getElementById("problemBox");
    if (box) { box.parentNode.removeChild(box); }
    runNextTest();
  });
}


function loadTestFrame(cb, src) {
  var box = document.createElement('div');
  box.className = "problemBox";
  box.style.cssText += "position: absolute; visibility: hidden;";
  document.body.appendChild(box);
  box.id = "problemBox";

  if (typeof src == "undefined") { src = 4; }

  if (typeof src == "number") {
    var pgs = [];
    for (var i = 1, ii = src; i <= ii; ++i) {
      pgs.push('<p>You are on page '+i+' of this book.</p>');
    }
    src = "javascript:'<!DOCTYPE html><html>"+
      '<head><style>p{line-height:240px;text-align:center;}</style></head>'+
      '<body>'+pgs.join("")+'</body>'+
      "</html>'";
  }

  var fr = document.createElement('iframe');
  box.appendChild(fr);
  fr.setAttribute("scrolling", "no");
  fr.onload = function () {
    if (!fr.contentDocument || !fr.contentDocument.body) { return; }
    var bdy = fr.contentDocument.body;
    bdy.style.cssText = ([
      "margin:0",
      "padding:0",
      "position:absolute",
      "height:100%",
      "width:100%",
      "-webkit-column-width:300px",
      "-webkit-column-gap:0",
      "-moz-column-width:300px",
      "-moz-column-gap:0",
      "-o-column-width:300px",
      "-o-column-gap:0",
      "column-width:300px",
      "column-gap:0"
    ].join(";"));
    if (bodyDimensions(fr).height > box.offsetHeight) {
      bdy.style.cssText += ["min-width:200%", "overflow:hidden"].join(";");
      if (bodyDimensions(fr).height <= box.offsetHeight) {
        bdy.className = "column-force";
      } else {
        bdy.className = "column-failed "+bodyDimensions(fr).height;
        console.log("failed");
      }
    }
    cb(fr);
  }
  fr.src = src;
}


function bodyDimensions(fr) {
  var doc = fr.contentDocument;
  var result = {
    width: doc.documentElement.scrollWidth,
    height: doc.documentElement.scrollHeight
  }
  if (result.height == 0) {
    result.width = doc.body.scrollWidth;
    result.height = doc.body.scrollHeight;
  }
  return result;
}


window.onload = runNextTest;
