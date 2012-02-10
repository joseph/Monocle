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
    p.defaultStyles = addPageStyles(defCSS, false);
    if (implStyles) {
      p.initialStyles = addPageStyles(implStyles, false);
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
        addPageStylesheet(cmpt.contentDocument, sheetIndex);
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
      dispatchChanging();
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


  function dispatchChanging() {
    p.reader.dispatchEvent("monocle:stylesheetchanging", {});
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


  /* FONT SCALING */

  function setFontScale(scale, restorePlace) {
    p.fontScale = scale;
    if (restorePlace) {
      dispatchChanging();
    }
    var i = 0, cmpt = null;
    while (cmpt = p.reader.dom.find('component', i++)) {
      adjustFontScaleForDoc(cmpt.contentDocument, scale);
    }
    if (restorePlace) {
      p.reader.recalculateDimensions(true);
      dispatchChange();
    } else {
      p.reader.recalculateDimensions(false);
    }
  }


  function adjustFontScaleForDoc(doc, scale) {
    var elems = doc.getElementsByTagName('*');
    if (scale) {
      scale = parseFloat(scale);
      if (!doc.pfsSwept) {
        sweepElements(doc, elems);
      }

      // Iterate over each element, applying scale to the original
      // font-size. If a proportional font sizing is already applied to
      // the element, update existing cssText, otherwise append new cssText.
      //
      for (var j = 0, jj = elems.length; j < jj; ++j) {
        var newFs = fsProperty(elems[j].pfsOriginal, scale);
        if (elems[j].pfsApplied) {
          replaceFontSizeInStyle(elems[j], newFs);
        } else {
          elems[j].style.cssText += newFs;
        }
        elems[j].pfsApplied = scale;
      }
    } else if (doc.pfsSwept) {
      // Iterate over each element, removing proportional font-sizing flag
      // and property from cssText.
      for (var j = 0, jj = elems.length; j < jj; ++j) {
        if (elems[j].pfsApplied) {
          var oprop = elems[j].pfsOriginalProp;
          var opropDec = oprop ? 'font-size: '+oprop+' ! important;' : '';
          replaceFontSizeInStyle(elems[j], opropDec);
          elems[j].pfsApplied = null;
        }
      }

      // Establish new baselines in case classes have changed.
      sweepElements(doc, elems);
    }
  }


  function sweepElements(doc, elems) {
    // Iterate over each element, looking at its font size and storing
    // the original value against the element.
    for (var i = 0, ii = elems.length; i < ii; ++i) {
      var currStyle = doc.defaultView.getComputedStyle(elems[i], null);
      var fs = parseFloat(currStyle.getPropertyValue('font-size'));
      elems[i].pfsOriginal = fs;
      elems[i].pfsOriginalProp = elems[i].style.fontSize;
    }
    doc.pfsSwept = true;
  }


  function fsProperty(orig, scale) {
    return 'font-size: '+(orig*scale)+'px ! important;';
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
