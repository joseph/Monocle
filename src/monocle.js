Monocle = {
  VERSION: "1.0.0"
};

Monocle.pieceLoaded = function (piece) {
  if (typeof onMonoclePiece == 'function') {
    onMonoclePiece(piece);
  }
}


//= require <compat>
//= require <events>
//= require <styles>
//= require <reader>
//= require <book>
//= require <place>
//= require <component>

Monocle.Controls = {};
Monocle.Flippers = {};
Monocle.Panels = {};

//= require <controls/panel>
//= require <panels/twopane>
//= require <flippers/legacy>
//= require <flippers/slider>

Monocle.pieceLoaded('monocle');
