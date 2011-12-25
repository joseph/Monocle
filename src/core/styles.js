Monocle.Styles = {

  // Takes a hash and returns a string.
  rulesToString: function (rules) {
    if (typeof rules != 'string') {
      var parts = [];
      for (var declaration in rules) {
        parts.push(declaration+": "+rules[declaration]+";")
      }
      rules = parts.join(" ");
    }
    return rules;
  },


  // Takes a hash or string of CSS property assignments and applies them
  // to the element.
  //
  applyRules: function (elem, rules) {
    rules = Monocle.Styles.rulesToString(rules);
    elem.style.cssText += ';'+rules;
    return elem.style.cssText;
  },


  // Generates cross-browser properties for a given property.
  // ie, affix(<elem>, 'transition', 'linear 100ms') would apply that value
  // to webkitTransition for WebKit browsers, and to MozTransition for Gecko.
  //
  affix: function (elem, property, value) {
    var target = elem.style ? elem.style : elem;
    var props = Monocle.Browser.css.toDOMProps(property);
    while (props.length) { target[props.shift()] = value; }
  },


  setX: function (elem, x) {
    var s = elem.style;
    if (typeof x == "number") { x += "px"; }
    if (Monocle.Browser.env.supportsTransform3d) {
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
    if (Monocle.Browser.env.supportsTransform3d) {
      s.webkitTransform = "translate3d(0, "+y+", 0)";
    } else {
      s.webkitTransform = "translateY("+y+")";
    }
    s.MozTransform = s.OTransform = s.transform = "translateY("+y+")";
    return y;
  },


  getX: function (elem) {
    var currStyle = document.defaultView.getComputedStyle(elem, null);
    var re = /matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([^,]+),[^\)]+\)/;
    var props = Monocle.Browser.css.toDOMProps('transform');
    var matrix = null;
    while (props.length && !matrix) {
      matrix = currStyle[props.shift()];
    }
    return parseInt(matrix.match(re)[1]);
  },


  transitionFor: function (elem, prop, duration, timing, delay) {
    var tProps = Monocle.Browser.css.toDOMProps('transition');
    var pProps = Monocle.Browser.css.toCSSProps(prop);
    timing = timing || "linear";
    delay = (delay || 0)+"ms";
    for (var i = 0, ii = tProps.length; i < ii; ++i) {
      var t = "none";
      if (duration) {
        t = [pProps[i], duration+"ms", timing, delay].join(" ");
      }
      elem.style[tProps[i]] = t;
    }
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
  "-webkit-transform": "translate3d(0,0,0)",
  "visibility": "visible"

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
  "overflow": "hidden"

  /*
  "top": "0",
  "left": "0",
  "bottom": "0",
  "right": "0"
  */
}

Monocle.Styles.component = {
  "width": "100%",
  "height": "100%",
  "border": "none",
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



Monocle.pieceLoaded('core/styles');
