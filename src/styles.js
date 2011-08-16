Monocle.Styles = {

  // Takes a hash or string of CSS property assignments and applies them
  // to the element.
  //
  applyRules: function (elem, rules) {
    if (typeof rules != 'string') {
      var parts = [];
      for (var declaration in rules) {
        parts.push(declaration+": "+rules[declaration]+";")
      }
      rules = parts.join(" ");
    }
    elem.style.cssText += ';'+rules;
    return elem.style.cssText;
  },


  // Generates cross-browser properties for a given property.
  // ie, affix(<elem>, 'transition', 'linear 100ms') would apply that value
  // to webkitTransition for WebKit browsers, and to MozTransition for Gecko.
  //
  affix: function (elem, property, value) {
    var target = elem.style ? elem.style : elem;
    var props = Monocle.Browser.CSSProps.toDOMProps(property);
    for (var i = 0, ii = props.length; i < ii; ++i) {
      target[props[i]] = value;
    }
  },


  setX: function (elem, x) {
    var s = elem.style;
    if (typeof x == "number") { x += "px"; }
    if (Monocle.Browser.has.transform3d) {
      s.webkitTransform = "translate3d("+x+", 0, 0)";
    } else {
      s.webkitTransform = "translateX("+x+")";
    }
    s.MozTransform = s.OTransform = s.transform = "translateX("+x+")";
    return x;
  },


  setY: function (elem, y) {
    var s = elem.style;
    if (typeof y == "number") { y += "px"; }
    if (Monocle.Browser.has.transform3d) {
      s.webkitTransform = "translate3d(0, "+y+", 0)";
    } else {
      s.webkitTransform = "translateY("+y+")";
    }
    s.MozTransform = s.OTransform = s.transform = "translateY("+y+")";
    return y;
  }

}


// These rule definitions are more or less compulsory for Monocle to behave
// as expected. Which is why they appear here and not in the stylesheet.
// Adjust them if you know what you're doing.
//
Monocle.Styles.container = {
  "position": "absolute",
  "top": "0",
  "left": "0",
  "bottom": "0",
  "right": "0"
}

Monocle.Styles.page = {
  "position": "absolute",
  "z-index": "1",
  "-webkit-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none",
  "-webkit-transform": "translate3d(0,0,0)"

  /*
  "background": "white",
  "top": "0",
  "left": "0",
  "bottom": "0",
  "right": "0"
  */
}

Monocle.Styles.sheaf = {
  "position": "absolute",
  "overflow": "hidden" // Required by MobileSafari to constrain inner iFrame.

  /*
  "top": "0",
  "left": "0",
  "bottom": "0",
  "right": "0"
  */
}

Monocle.Styles.component = {
  "display": "block",
  "width": "100%",
  "height": "100%",
  "border": "none",
  "overflow": "hidden",
  "-webkit-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none"
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



Monocle.pieceLoaded('styles');
