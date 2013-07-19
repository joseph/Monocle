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

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
if ( !Array.prototype.forEach ) {

  Array.prototype.forEach = function forEach( callback, thisArg ) {

    var T, k;

    if (this === null) {
      throw new TypeError( "this is null or not defined" );
    }

    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0; // Hack to convert O.length to a UInt32

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if ( {}.toString.call(callback) !== "[object Function]" ) {
      throw new TypeError( callback + " is not a function" );
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if ( arguments.length >= 2 ) {
      T = thisArg;
    }

    // 6. Let k be 0
    k = 0;

    // 7. Repeat, while k < len
    while( k < len ) {

      var kValue;

      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if ( k in O ) {

        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
        kValue = O[ k ];

        // ii. Call the Call internal method of callback with T as the this value and
        // argument list containing kValue, k, and O.
        callback.call( T, kValue, k, O );
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined
  };
}

