Monocle = {
  VERSION: "2.0.0"
};


Monocle.pieceLoaded = function (piece) {
  if (typeof onMonoclePiece == 'function') {
    onMonoclePiece(piece);
  }
}


Monocle.defer = function (fn, time) {
  if (fn && typeof fn == "function") {
    return setTimeout(fn, time || 0);
  }
}


//= require "compat"
//= require "factory"
//= require "events"
//= require "styles"
//= require "reader"
//= require "book"
//= require "place"
//= require "component"

Monocle.Dimensions = {}
Monocle.Controls = {};
Monocle.Flippers = {};
Monocle.Panels = {};

//= require "controls/panel"
//= require "panels/twopane"
//= require "dimensions/vert"
//= require "flippers/legacy"
//= require "dimensions/columns"
//= require "flippers/slider"

Monocle.pieceLoaded('monocle');
