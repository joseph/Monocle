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
    return out.join("; ") + ";";
  },
  capitalize: function (wd) {
    return wd ? wd.substring(0,1).toUpperCase() + wd.substring(1,wd.length) : "";
  }
}


Monocle.Styles.container = {
  "position": "absolute",
  "width": "100%",
  "height": "100%",
  "background-color": "black",
  "-webkit-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none"
}

Monocle.Styles.page = {
  "position": "absolute",
  "top": "0",
  "left": "0",
  "bottom": "3px",
  "right": "5px",
  "background": "#FFF",
  "z-index": "1",
  "outline": "1px solid #999",
  "-webkit-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none"
}

Monocle.Styles.sheaf = {
  "position": "absolute",
  "top": "1em",
  "bottom": "1em",
  "left": "1em",
  "right": "1em",
  "overflow": "hidden", // Required by MobileSafari to constrain inner iFrame.
  "-webkit-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none"
}

Monocle.Styles.component = {
  "display": "block",
  "height": "100%",
  "width": "100%",
  "border": "none",
  "overflow": "hidden",
  "-webkit-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none"
}

Monocle.Styles.body = {
  "margin": "0",
  "padding": "0",
  "position": "absolute",
  "height": "100%",
  "min-width": "200%",
  "-webkit-column-gap": "0",
  "-webkit-column-fill": "auto",
  "-webkit-text-size-adjust": "none",
  "-moz-column-gap": "0",
  "column-gap": "0",
  "column-fill": "0"
}

Monocle.Styles.control = {
  "z-index": "100",
  "cursor": "pointer"
}

Monocle.Styles.overlay = {
  "position": "absolute",
  "display": "none",
  "width": "100%",
  "height": "100%",
  "z-index": "1000"
}

Monocle.Styles.Controls = {
  // A separate namespace for optional control styles, populated by those
  // optional scripts.
}

Monocle.Styles.Flippers = {
  // A separate namespace for flippers.
}

Monocle.Styles.Panels = {
  // Likewise for panels.
}

Monocle.pieceLoaded('styles');
