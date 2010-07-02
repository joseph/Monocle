Monocle = {
  VERSION: "1.0.0"
};

Monocle.pieceLoaded = function (piece) {
  if (typeof onMonoclePiece == 'function') {
    onMonoclePiece(piece);
  }
}

Monocle.Styles = {
  ruleText: function (rule) {
    if (typeof rule == "string") {
      rule = this[rule];
    }
    if (!rule) { return ""; }

    var parts = [];
    for (var declaration in rule) {
      parts.push(declaration + ": " + rule[declaration] + ";")
    }
    return parts.join(" ");
  },
  applyRules: function (elem, rule) {
    if (typeof rule == "string") {
      elem.className = "mon_"+rule;
    }
    elem.style.cssText = this.ruleText(rule);
  },
  affix: function (elem, property, value) {
    var target = elem.style ? elem.style : elem;

    if (Monocle.Browser.is.Gecko) {
      var parts = property.split('-');
      for (var i = parts.length; i > 0; --i) {
        parts[i] = this.capitalize(parts[i]);
      }
      target[parts.join('')] = value;
      parts[0] = this.capitalize(parts[0]);
      target['Moz'+parts.join('')] = value;
    }
    if (Monocle.Browser.is.WebKit) {
      target[property] = value;
      target['-webkit-'+property] = value;
    }
  },
  expand: function (property, value) {
    var out = [];
    out.push(property + ": " + value);
    if (Monocle.Browser.is.Gecko) {
      out.push("-moz-"+property+": "+value);
    }
    if (Monocle.Browser.is.WebKit) {
      out.push("-webkit-"+property+": "+value);
    }
    return out.join("; ");
  },
  capitalize: function (wd) {
    return wd ? wd.substring(0,1).toUpperCase() + wd.substring(1,wd.length) : "";
  }
}

//= require <compat>
//= require <events>
//= require <reader>
//= require <book>
//= require <place>
//= require <component>
//= require <styles>

Monocle.Flippers = {};
Monocle.Controls = {};

//= require <flippers/legacy>
//= require <flippers/slider>

Monocle.pieceLoaded('monocle');
