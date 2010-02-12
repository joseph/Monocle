/* STYLES */
Carlyle.Styles = {
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
  },

  container: {
    "position": "absolute",
    "width": "100%",
    "height": "100%",
    "background": "#FFF",
    "-webkit-user-select": "none",
    "-webkit-text-size-adjust": "none"
  },

  page: {
    "position": "absolute",
    "top": 0,
    "left": 0,
    "bottom": "3px",
    "right": "5px",
    "background": "#FFF",
    "cursor": "pointer",
    "-webkit-box-shadow": "2px 0 3px #777"
  },

  overPage: {
    "-webkit-transform-style": "preserve-3d",
    "opacity": 0.01
  },

  header: {
    "position": "absolute",
    "top": "8px",
    "left": "1em",
    "right": "1em",
    "color": "#AAA",
    "text-transform": "uppercase"
  },

  footer: {
    "position": "absolute",
    "bottom": "8px",
    "left": "1em",
    "right": "1em",
    "color": "#AAA",
    "text-transform": "uppercase"
  },

  runnerLeft: {
    "float": "left",
    "font-size": "80%",
    "white-space": "nowrap",
    "text-overflow": "ellipsis",
    "overflow": "hidden",
    "width": "50%"
  },

  runnerRight: {
    "float": "right",
    "font-size": "80%",
    "text-align": "right",
    "white-space": "nowrap",
    "width": "50%"
  },

  scroller: {
    "position": "absolute",
    "top": "1.8em",
    "bottom": "1.8em",
    "left": "1em",
    "right": "1em",
    "word-wrap": "break-word",
    "overflow": "hidden"
  },

  content: {
    "position": "absolute",
    "top": 0,
    "bottom": 0,
    "min-width": "200%",
    "-webkit-text-size-adjust": "none",
    "-webkit-column-gap": 0,
    "-webkit-column-fill": "auto"
  },

  spinner: {
    "width": "48px",
    "height": "48px",
    "position": "relative",
    "display": "block",
    "margin": "auto"
  },

  Controls: {
    // A separate namespace for optional control styles, populated by those
    // optional scripts.
  }
}
