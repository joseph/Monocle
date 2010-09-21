Monocle = {
  VERSION: "1.0.0"
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

Monocle.Controls = {};
Monocle.Flippers = {};
Monocle.Panels = {};

//= require "controls/panel"
//= require "panels/twopane"
//= require "flippers/legacy"
//= require "flippers/slider"

Monocle.pieceLoaded('monocle');
