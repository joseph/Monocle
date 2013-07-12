// STUBS - simple debug functions and polyfills to normalise client
// execution environments.


// A little console stub if not initialized in a console-equipped browser.
//
if (typeof window.console == "undefined") {
  window.console = { messages: [] }
  window.console.log = function (msg) {
    this.messages.push(msg);
  }
  window.console.warn = window.console.log;
}


// A simple version of console.dir that works on iOS.
//
window.console.compatDir = function (obj) {
  var stringify = function (o) {
    var parts = [];
    for (var x in o) {
      parts.push(x + ": " + o[x]);
    }
    return parts.join(";\n");
  }

  var out = stringify(obj);
  window.console.log(out);
  return out;
}


// This is called by Monocle methods and practices that are no longer
// recommended and will soon be removed.
//
window.console.deprecation = function (msg) {
  console.warn("[DEPRECATION]: "+msg);
  if (typeof console.trace == "function") {
    console.trace();
  }
}


// A convenient alias for setTimeout that assumes 0 if no timeout is specified.
//
Monocle.defer = function (fn, time) {
  if (typeof fn == "function") {
    return setTimeout(fn, time || 0);
  }
}
