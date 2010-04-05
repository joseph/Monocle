Monocle.Styles.container = {
  "position": "absolute",
  "width": "100%",
  "height": "100%",
  "-webkit-user-select": "none",
  "-webkit-text-size-adjust": "none"
}

Monocle.Styles.overlay = {
  "position": "absolute",
  "display": "none",
  "width": "100%",
  "height": "100%",
  "z-index": "1000"
}

Monocle.Styles.page = {
  "position": "absolute",
  "top": "0",
  "left": "0",
  "bottom": "3px",
  "right": "5px",
  "background": "#FFF",
  "cursor": "pointer",
  "z-index": "1",
  "-webkit-box-shadow": "2px 0 2px #999",
  "-moz-box-shadow": "2px 0 2px #999",
  "-webkit-transform-style": "preserve-3d"
}

Monocle.Styles.scroller = {
  "position": "absolute",
  "top": "1em",
  "bottom": "1em",
  "left": "1em",
  "right": "1em",
  "overflow": "hidden" // Required by MobileSafari to constrain inner iFrame.
}

Monocle.Styles.content = {
  "display": "block",
  "height": "100%",
  "width": "100%",
  "border": "none",
  "cursor": "pointer",
  "overflow": "hidden",

  // This stuff should be moved to the content iframe document body?
  "-webkit-text-size-adjust": "none"
}

Monocle.Styles.spinner = {
  "width": "48px",
  "height": "48px",
  "position": "relative",
  "display": "block",
  "margin": "auto"
}

Monocle.Styles.control = {
  "z-index": "100"  // Must be higher than any pages
}

Monocle.Styles.Controls = {
  // A separate namespace for optional control styles, populated by those
  // optional scripts.
}

Monocle.Styles.Flippers = {
  // A separate namespace for flippers.
}

Monocle.pieceLoaded('styles');
