Monocle.Styles.container = {
  "position": "absolute",
  "width": "100%",
  "height": "100%",
  "-webkit-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none",
  "background-color": "black"
}

Monocle.Styles.page = {
  "position": "absolute",
  "top": "0",
  "left": "0",
  "bottom": "3px",
  "right": "5px",
  "background": "#FFF",
  "z-index": "1",
  "-webkit-transform-style": "preserve-3d",
  "outline": "1px solid #999"
}

Monocle.Styles.sheaf = {
  "position": "absolute",
  "top": "1em",
  "bottom": "1em",
  "left": "1em",
  "right": "1em",
  "overflow": "hidden" // Required by MobileSafari to constrain inner iFrame.
}

Monocle.Styles.component = {
  "display": "block",
  "height": "100%",
  "width": "100%",
  "border": "none",
  "overflow": "hidden"
}

Monocle.Styles.body = {
  "margin": "0",
  "padding": "0",
  "position": "absolute",
  "height": "100%",
  "min-width": "200%",
  "-webkit-column-gap": "0",
  "-webkit-column-fill": "auto",
  "-webkit-user-select": "none",
  "-webkit-text-size-adjust": "none",
  "-moz-column-gap": "0",
  "-moz-user-select": "none",
  "column-gap": "0",
  "column-fill": "0",
  "user-select": "none"
}

Monocle.Styles.controls = {
  "position": "absolute",
  "top": "0",
  "bottom": "0",
  "left": "0",
  "right": "0",
  "cursor": "pointer"
}

Monocle.Styles.control = {
  "z-index": "100"
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

Monocle.pieceLoaded('styles');
