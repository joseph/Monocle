Monocle.DEBUG = true;

(function () {
  function readUA() {
    testResult("userAgent", navigator.userAgent);
  }


  function readBrowser() {
    var res = [];
    for (var prop in Monocle.Browser.is) {
      var val = Monocle.Browser.is[prop];
      if (val) { res.push("is."+prop); }
    }
    for (var prop in Monocle.Browser.on) {
      var val = Monocle.Browser.on[prop];
      if (val) { res.push("on."+prop); }
    }
    testResult(
      "Browser",
      "engine: "+Monocle.Browser.engine+". "+res.join(", ")+"."
    );
  }


  function testResult(name, val) {
    var tbl = document.getElementById('results');
    var row = document.createElement('tr');
    var nCell = document.createElement('td');
    var vCell = document.createElement('td');
    var nCellText = document.createTextNode(name);
    var vCellText = document.createTextNode(val);
    nCell.appendChild(nCellText);
    vCell.appendChild(vCellText);
    vCell.style.color = colorForTestResult(name, val);
    row.appendChild(nCell);
    row.appendChild(vCell);
    tbl.appendChild(row);
  }


  function colorForTestResult(name, val) {
    var neutralNames = ["userAgent", "Browser", "touch", "embedded"];
    try {
      if (neutralNames.indexOf(name) >= 0) {
        return "black";
      }
    } catch (e) {}
    if (name.match(/^supports/)) {
      return val ? "green" : "red";
    }
    return val ? "orange": "green";
  }


  function assertCompatibility(env) {
    var div = document.getElementById('compatibility');
    div.style.display = 'block';
    var x = env.isCompatible() ? "compatible" : "incompatible";
    div.innerHTML = "This browser is "+x+" with Monocle.";
    div.className = x;
  }


  function init() {
    readUA();
    readBrowser();
    Monocle.Browser.css = new Monocle.CSS();
    env = new Monocle.Env();
    env.properties.resultCallback = testResult;
    env.survey(assertCompatibility);
  }

  window.onload = init;
})();

