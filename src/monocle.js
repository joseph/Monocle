Monocle = {
  VERSION: "1.0.0"
};

Monocle.Styles = {
  ruleText: function(rule) {
    if (typeof rule == "string") {
      rule = this[rule];
    }
    if (!rule) { return ""; }

    var parts = [];
    for (var declaration in rule) {
      parts.push(declaration + ": " + rule[declaration] + ";")
    }
    return parts.join(" ");
  }
}

//= require <compat>
//= require <reader>
//= require <book>
//= require <place>
//= require <component>
//= require <styles>

Monocle.Flippers = {};
Monocle.Controls = {};

//= require <flippers/legacy>
//= require <flippers/slider>
