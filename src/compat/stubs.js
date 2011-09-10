// STUBS - simple debug functions and polyfills to normalise client
// execution environments.


// A little console stub if not initialized in a console-equipped browser.
//
if (typeof window.console == "undefined") {
  window.console = {
    messages: [],
    log: function (msg) {
      this.messages.push(msg);
    }
  }
}


// A simple version of console.dir that works on iOS.
//
window.console.compatDir = function (obj) {
  var stringify = function (o) {
    var parts = [];
    for (x in o) {
      parts.push(x + ": " + o[x]);
    }
    return parts.join("; ");
  }

  window.console.log(stringify(obj));
}


Monocle.pieceLoaded('compat/stubs');
