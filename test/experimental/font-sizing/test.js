(function () {

  var sweptElements = false;

  function init() {
    var frame = document.getElementById('reader');
    var sel = document.getElementById('sizeSelect');
    sel.addEventListener('change', function (evt) {
      adjustFontSize(frame.contentDocument, sel.value);
    });
  }


  function adjustFontSize(doc, scale) {
    var elems = doc.getElementsByTagName('*');
    if (scale) {
      scale = parseFloat(scale);
      if (!sweptElements) {
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
    } else if (sweptElements) {
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
    sweptElements = true;
  }


  function fsProperty(orig, scale) {
    return 'font-size: '+(orig*scale)+'px ! important;';
  }


  function replaceFontSizeInStyle(elem, newProp) {
    var lastFs = /font-size:[^;]/
    elem.style.cssText = elem.style.cssText.replace(lastFs, newProp);
  }


  window.onload = init;
  window.onpageshow = function () {
    document.getElementById('sizeSelect').value = '';
  }

})();
