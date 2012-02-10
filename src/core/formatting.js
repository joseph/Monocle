Monocle.Formatting = function (reader, optStyles, optScale) {
  var API = { constructor: Monocle.Formatting };
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,

    // An array of style rules that are automatically applied to every page.
    stylesheets: [],

    // A multiplier on the default font-size of each element in every
    // component. If null, the multiplier is not applied (or it is removed).
    fontScale: null
  }


  function initialize() {
    clampStylesheets(optStyles);
    p.reader.listen('monocle:componentmodify', persistOnComponentChange);
  }


  // Clamp page frames to a set of styles that reduce Monocle breakage.
  //
  function clampStylesheets(implStyles) {
    var defCSS = k.DEFAULT_STYLE_RULES;
    if (Monocle.Browser.env.floatsIgnoreColumns) {
      defCSS.push("html#RS\\:monocle * { float: none !important; }");
    }
    p.defaultStyles = addPageStyles(defCSS, false);
    if (implStyles) {
      p.initialStyles = addPageStyles(implStyles, false);
    }
  }


  function persistOnComponentChange(evt) {
    var doc = evt.m['document'];
    doc.documentElement.id = p.reader.properties.systemId;
    for (var i = 0; i < p.stylesheets.length; ++i) {
      if (p.stylesheets[i]) {
        addPageStylesheet(doc, i);
      }
    }
  }


  /* PAGE STYLESHEETS */

  // API for adding a new stylesheet to all components. styleRules should be
  // a string of CSS rules. restorePlace defaults to true.
  //
  // Returns a sheet index value that can be used with updatePageStyles
  // and removePageStyles.
  //
  function addPageStyles(styleRules, restorePlace) {
    return changingStylesheet(function () {
      p.stylesheets.push(styleRules);
      var sheetIndex = p.stylesheets.length - 1;

      var i = 0, cmpt = null;
      while (cmpt = p.reader.dom.find('component', i++)) {
        if (cmpt.contentDocument) {
        addPageStylesheet(cmpt.contentDocument, sheetIndex);
        }
      }
      return sheetIndex;
    }, restorePlace);
  }


  // API for updating the styleRules in an existing page stylesheet across
  // all components. Takes a sheet index value obtained via addPageStyles.
  //
  function updatePageStyles(sheetIndex, styleRules, restorePlace) {
    return changingStylesheet(function () {
      p.stylesheets[sheetIndex] = styleRules;
      if (typeof styleRules.join == "function") {
        styleRules = styleRules.join("\n");
      }

      var i = 0, cmpt = null;
      while (cmpt = p.reader.dom.find('component', i++)) {
        var doc = cmpt.contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        if (!styleTag) {
          console.warn('No such stylesheet: ' + sheetIndex);
          return;
        }
        if (styleTag.styleSheet) {
          styleTag.styleSheet.cssText = styleRules;
        } else {
          styleTag.replaceChild(
            doc.createTextNode(styleRules),
            styleTag.firstChild
          );
        }
      }
    }, restorePlace);
  }


  // API for removing a page stylesheet from all components. Takes a sheet
  // index value obtained via addPageStyles.
  //
  function removePageStyles(sheetIndex, restorePlace) {
    return changingStylesheet(function () {
      p.stylesheets[sheetIndex] = null;
      var i = 0, cmpt = null;
      while (cmpt = p.reader.dom.find('component', i++)) {
        var doc = cmpt.contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        styleTag.parentNode.removeChild(styleTag);
      }
    }, restorePlace);
  }


  // Wraps all API-based stylesheet changes (add, update, remove) in a
  // brace of custom events (stylesheetchanging/stylesheetchange), and
  // recalculates component dimensions if specified (default to true).
  //
  function changingStylesheet(callback, restorePlace) {
    restorePlace = (restorePlace === false) ? false : true;
    if (restorePlace) {
      p.reader.dispatchEvent("monocle:stylesheetchanging", {});
    }
    var result = callback();
    if (restorePlace) {
      p.reader.recalculateDimensions(true);
      Monocle.defer(dispatchChange);
    } else {
      p.reader.recalculateDimensions(false);
    }
    return result;
  }


  function dispatchChange() {
    p.reader.dispatchEvent("monocle:stylesheetchange", {});
  }


  // Private method for adding a stylesheet to a component. Used by
  // addPageStyles.
  //
  function addPageStylesheet(doc, sheetIndex) {
    var styleRules = p.stylesheets[sheetIndex];

    if (!styleRules) {
      return;
    }

    var head = doc.getElementsByTagName('head')[0];
    if (!head) {
      head = doc.createElement('head');
      doc.documentElement.appendChild(head);
    }

    if (typeof styleRules.join == "function") {
      styleRules = styleRules.join("\n");
    }

    var styleTag = doc.createElement('style');
    styleTag.type = 'text/css';
    styleTag.id = "monStylesheet"+sheetIndex;
    if (styleTag.styleSheet) {
      styleTag.styleSheet.cssText = styleRules;
    } else {
      styleTag.appendChild(doc.createTextNode(styleRules));
    }

    head.appendChild(styleTag);

    return styleTag;
  }


  API.addPageStyles = addPageStyles;
  API.updatePageStyles = updatePageStyles;
  API.removePageStyles = removePageStyles;

  initialize();

  return API;
}



Monocle.Formatting.DEFAULT_STYLE_RULES = [
  "html#RS\\:monocle * {" +
    "-webkit-font-smoothing: subpixel-antialiased;" +
    "text-rendering: auto !important;" +
    "word-wrap: break-word !important;" +
    "overflow: visible !important;" +
  "}",
  "html#RS\\:monocle body {" +
    "margin: 0 !important;"+
    "border: none !important;" +
    "padding: 0 !important;" +
    "width: 100% !important;" +
    "position: absolute !important;" +
    "-webkit-text-size-adjust: none;" +
  "}",
  "html#RS\\:monocle body * {" +
    "max-width: 100% !important;" +
  "}",
  "html#RS\\:monocle img, html#RS\\:monocle video, html#RS\\:monocle object {" +
    "max-height: 95% !important;" +
    "height: auto !important;" +
  "}"
]
