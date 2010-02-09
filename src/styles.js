/* STYLES */
Carlyle.Styles = {
  ruleText: function(rule) {
    if (!this[rule]) { return ""; }
    var parts = [];
    for (var declaration in this[rule]) {
      parts.push(declaration + ": " + this[rule][declaration] + ";")
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
    "-webkit-box-shadow": "2px 0 3px #777",
    "z-index": "1"
  },

  overPage: {
    "-webkit-transform": "translateX(-110%)",
    "-webkit-transform-style": "preserve-3d"
  },

  header: {
    "position": "absolute",
    "top": "4px",
    "left": "1em",
    "right": "1em",
    "color": "#AAA",
    "text-transform": "uppercase"
  },

  footer: {
    "position": "absolute",
    "bottom": "4px",
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

  bodyText: {
    "position": "absolute",
    "top": "1.4em",
    "bottom": "1.4em",
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
    "font-size": "13pt",
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
  }
}
