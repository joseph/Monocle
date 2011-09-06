function onEvaluate(evt) {
  evt.preventDefault();

  var script = document.getElementById("scratchText").value;
  var problems = ["problem1", "problem2", "problem3"];
  var out = document.getElementById("scratchResult");
  out.innerHTML = "";
  for (var i = 1; i <= 3; ++i) {
    var _frame = document.getElementById("problem"+i);
    var _div = _frame.parentNode;
    var _window = _frame.contentWindow;
    var _body = _frame.contentDocument.body;
    out.innerHTML += "Problem "+i+": "+eval(script)+"<br />";
  }
}


function scratchSetup() {
  var form = document.getElementById("scratch");
  form.onsubmit = onEvaluate;
}


window.onload = scratchSetup;
