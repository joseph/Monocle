/*!
 * Monocle - A silky, tactile browser-based ebook JavaScript library.
 *
 * Copyright 2012, Joseph Pearson
 * Licensed under the MIT license.
 */

Monocle = {
  VERSION: "2.3.0"
};


Monocle.defer = function (fn, time) {
  if (fn && typeof fn == "function") {
    return setTimeout(fn, time || 0);
  }
}


Monocle.Dimensions = {}
Monocle.Controls = {};
Monocle.Flippers = {};
Monocle.Panels = {};
