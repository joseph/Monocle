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
    p.fontScale = optScale;
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
    p.defaultStyles = addPageStyles(defCSS);
    if (implStyles) {
      p.initialStyles = addPageStyles(implStyles);
    }
  }


  function persistOnComponentChange(evt) {
    var doc = evt.m['document'];
    doc.documentElement.id = p.reader.properties.systemId;
    adjustFontScaleForDoc(doc, p.fontScale);
    for (var i = 0; i < p.stylesheets.length; ++i) {
      if (p.stylesheets[i]) {
        addPageStylesheet(doc, i);
      }
    }
  }


  /* PAGE STYLESHEETS */

  // API for adding a new stylesheet to all components. styleRules should be
  // a string of CSS rules.
  //
  // Returns a sheet index value that can be used with updatePageStyles
  // and removePageStyles.
  //
  function addPageStyles(styleRules) {
    return changingStylesheet(function () {
      p.stylesheets.push(styleRules);
      var sheetIndex = p.stylesheets.length - 1;

      var i = 0, cmpt = null;
      while (cmpt = p.reader.dom.find('component', i++)) {
        addPageStylesheet(cmpt.contentDocument, sheetIndex);
      }
      return sheetIndex;
    });
  }


  // API for updating the styleRules in an existing page stylesheet across
  // all components. Takes a sheet index value obtained via addPageStyles.
  //
  function updatePageStyles(sheetIndex, styleRules) {
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
    });
  }


  // API for removing a page stylesheet from all components. Takes a sheet
  // index value obtained via addPageStyles.
  //
  function removePageStyles(sheetIndex) {
    return changingStylesheet(function () {
      p.stylesheets[sheetIndex] = null;
      var i = 0, cmpt = null;
      while (cmpt = p.reader.dom.find('component', i++)) {
        var doc = cmpt.contentDocument;
        var styleTag = doc.getElementById('monStylesheet'+sheetIndex);
        styleTag.parentNode.removeChild(styleTag);
      }
    });
  }


  // Wraps all API-based stylesheet changes (add, update, remove) in a
  // brace of custom events (stylesheetchanging/stylesheetchange), and
  // recalculates component dimensions if specified (default to true).
  //
  function changingStylesheet(callback) {
    dispatchChanging();
    var result = callback();
    p.reader.recalculateDimensions();
    return result;
  }


  function dispatchChanging() {
    p.reader.listen('monocle:recalculated', dispatchChange);
    p.reader.dispatchEvent("monocle:stylesheetchanging", {});
  }


  function dispatchChange() {
    p.reader.deafen('monocle:recalculated', dispatchChange);
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

    if (!doc || !doc.documentElement) {
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


  /* FONT SCALING */

  function setFontScale(scale) {
    p.fontScale = scale;
    dispatchChanging();
    var i = 0, cmpt = null;
    while (cmpt = p.reader.dom.find('component', i++)) {
      adjustFontScaleForDoc(cmpt.contentDocument, scale);
    }
    p.reader.recalculateDimensions();
  }


  function adjustFontScaleForDoc(doc, scale) {
    if (scale) {
      if (!doc.body.pfsSwept) {
        sweepElements(doc);
      }
      var evtData = { document: doc, scale: parseFloat(scale) };
      p.reader.dispatchEvent('monocle:fontscaling', evtData);
      scale = evtData.scale;

      // Iterate over each element, applying scale to the original
      // font-size. If a proportional font sizing is already applied to
      // the element, update existing cssText, otherwise append new cssText.
      walkTree(doc.body, function (elem) {
        if (typeof elem.pfsOriginal == 'undefined') { return; }
        var newFs = fsProperty(Math.round(elem.pfsOriginal*scale));
        if (elem.pfsApplied) {
          replaceFontSizeInStyle(elem, newFs);
        } else {
          elem.style.cssText += newFs;
        }
        elem.pfsApplied = scale;
      });

      p.reader.dispatchEvent('monocle:fontscale', evtData);
    } else if (doc.body.pfsApplied) {
      var evtData = { document: doc, scale: null };
      p.reader.dispatchEvent('monocle:fontscaling', evtData);

      // Iterate over each element, removing proportional font-sizing flag
      // and property from cssText.
      walkTree(doc.body, function (elem) {
        if (typeof elem.pfsOriginal == 'undefined') { return; }
        if (elem.pfsApplied) {
          var oprop = elem.pfsOriginalProp;
          var opropDec = oprop ? 'font-size: '+oprop+' ! important;' : '';
          replaceFontSizeInStyle(elem, opropDec);
          elem.pfsApplied = null;
        }
      });

      // Establish new baselines in case classes have changed.
      sweepElements(doc);

      p.reader.dispatchEvent('monocle:fontscale', evtData);
    }
  }


  function sweepElements(doc) {
    // Iterate over each element, looking at its font size and storing
    // the original value against the element.
    walkTree(doc.body, function (elem) {
      if (elem.getCTM) { return; } // Ignore SVG elements
      var currStyle = doc.defaultView.getComputedStyle(elem, null);
      var fs = parseFloat(currStyle.getPropertyValue('font-size'));
      elem.pfsOriginal = fs;
      elem.pfsOriginalProp = elem.style.fontSize;
    });
    doc.body.pfsSwept = true;
  }


  function walkTree(node, fn) {
    if (node.nodeType != 1) { return; }
    fn(node);
    node = node.firstChild;
    while (node) {
      walkTree(node, fn);
      node = node.nextSibling;
    }
  }


  function fsProperty(fsInPixels) {
    return 'font-size: '+fsInPixels+'px ! important;';
  }


  function replaceFontSizeInStyle(elem, newProp) {
    var lastFs = /font-size:[^;]/
    elem.style.cssText = elem.style.cssText.replace(lastFs, newProp);
  }


  API.addPageStyles = addPageStyles;
  API.updatePageStyles = updatePageStyles;
  API.removePageStyles = removePageStyles;
  API.setFontScale = setFontScale;

  initialize();

  return API;
}



Monocle.Formatting.DEFAULT_STYLE_RULES = [
  "html#RS\\:monocle * {" +
    "-webkit-font-smoothing: subpixel-antialiased;" +
    "text-rendering: auto !important;" +
    "word-wrap: break-word !important;" +
  "}",
  "html#RS\\:monocle body {" +
    "-webkit-text-size-adjust: none;" +
    "-ms-touch-action: none;" +
    "touch-action: none;" +
    "-ms-content-zooming: none;" +
    "-ms-content-zoom-chaining: chained;" +
    "-ms-content-zoom-limit-min: 100%;" +
    "-ms-content-zoom-limit-max: 100%;" +
    "-ms-touch-select: none;" +
  "}",
  "a:not([href]) { color: inherit; }"
]
