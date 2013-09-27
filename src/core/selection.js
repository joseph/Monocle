Monocle.Selection = function (reader) {
  var API = { constructor: Monocle.Selection };
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    lastSelection: []
  };


  function initialize() {
    if (k.SELECTION_POLLING_INTERVAL) {
      setInterval(pollSelection, k.SELECTION_POLLING_INTERVAL);
    }
  }


  function pollSelection() {
    var index = 0, frame = null;
    while (frame = reader.dom.find('component', index++)) {
      if (frame.contentWindow) {
        pollSelectionOnWindow(frame.contentWindow, index);
      }
    }
  }


  function pollSelectionOnWindow(win, index) {
    var sel = win.getSelection();
    if (!sel) { return; }
    var lm = p.lastSelection[index] || {};
    var nm = p.lastSelection[index] = {
      selected: anythingSelected(win),
      range: sel.rangeCount ? sel.getRangeAt(0) : null,
      string: sel.toString()
    };
    if (nm.selected) {
      nm.rangeStartContainer = nm.range.startContainer;
      nm.rangeEndContainer = nm.range.endContainer;
      nm.rangeStartOffset = nm.range.startOffset;
      nm.rangeEndOffset = nm.range.endOffset;
      if (!sameRange(nm, lm)) {
        p.reader.dispatchEvent('monocle:selection', nm);
      }
    } else if (lm.selected) {
      p.reader.dispatchEvent('monocle:deselection', lm);
    }
  }


  function sameRange(m1, m2) {
    return (
      m1.rangeStartContainer == m2.rangeStartContainer &&
      m1.rangeEndContainer == m2.rangeEndContainer &&
      m1.rangeStartOffset == m2.rangeStartOffset &&
      m1.rangeEndOffset == m2.rangeEndOffset
    );
  }


  // Given a window object, remove any user selections within. Trivial in
  // most browsers, but involving major mojo on iOS.
  //
  function deselect() {
    var index = 0, frame = null;
    while (frame = reader.dom.find('component', index++)) {
      deselectOnWindow(frame.contentWindow);
    }
  }


  function deselectOnWindow(win) {
    win = win || window;
    if (!anythingSelected(win)) { return; }

    if (Monocle.Browser.iOSVersion && !Monocle.Browser.iOSVersionBelow(5)) {
      preservingScale(function () {
        preservingScrollPosition(function () {
          var inp = document.createElement('input');
          inp.style.cssText = [
            'position: absolute',
            'top: 0',
            'left: 0',
            'width: 0',
            'height: 0'
          ].join(';');
          document.body.appendChild(inp);
          inp.focus();
          document.body.removeChild(inp);
        })
      });
    }

    var sel = win.getSelection();
    sel.removeAllRanges();
    win.document.body.scrollLeft = 0;
    win.document.body.scrollTop = 0;
  }


  function preservingScrollPosition(fn) {
    var sx = window.scrollX, sy = window.scrollY;
    fn();
    window.scrollTo(sx, sy);
  }


  function preservingScale(fn) {
    var head = document.querySelector('head');
    var ovp = head.querySelector('meta[name=viewport]');
    var createViewportMeta = function (content) {
      var elem = document.createElement('meta');
      elem.setAttribute('name', 'viewport');
      elem.setAttribute('content', content);
      head.appendChild(elem);
      return elem;
    }

    var nvp;
    if (ovp) {
      var ovpcontent = ovp.getAttribute('content');
      var re = /user-scalable\s*=\s*([^,$\s])*/;
      var result = ovpcontent.match(re);
      if (result && ['no', '0'].indexOf(result[1]) >= 0) {
        fn();
      } else {
        var nvpcontent = ovpcontent.replace(re, '');
        nvpcontent += nvpcontent ? ', ' : '';
        nvpcontent += 'user-scalable=no';
        head.removeChild(ovp);
        nvp = createViewportMeta(nvpcontent);
        fn();
        head.removeChild(nvp);
        head.appendChild(ovp);
      }
    } else {
      nvp = createViewportMeta('user-scalable=no');
      fn();
      nvp.setAttribute('content', 'user-scalable=yes');
    }
  }


  function anythingSelected(win) {
    var sel = win.getSelection();
    return sel && !sel.isCollapsed;
  }


  API.deselect = deselect;


  initialize();

  return API;
}


Monocle.Selection.SELECTION_POLLING_INTERVAL = 250;
