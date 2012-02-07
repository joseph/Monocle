(function () {

  var SELECTION_POLLING_INTERVAL = 250;
  var lastSelection = {};


  function init() {
    if (SELECTION_POLLING_INTERVAL) {
      setInterval(pollSelection, SELECTION_POLLING_INTERVAL);
    }
    var btn = document.getElementById('deselectBtn');
    btn.addEventListener('mousedown', deselectAction, false);
    btn.addEventListener('touchstart', deselectAction, false);
    var frame = document.getElementById('reader');
    frame.addEventListener('experimental:selection', textSelected, false);
    frame.addEventListener('experimental:deselection', textDeselected, false);
  }


  function pollSelection() {
    var frame = document.getElementById('reader');
    var sel = frame.contentWindow.getSelection();
    var lm = lastSelection;
    var nm = lastSelection = {
      range: sel.rangeCount ? sel.getRangeAt(0) : null,
      string: sel.toString()
    };
    if (nm.range && nm.string) {
      // Gecko keeps returning the same range object as the selection changes,
      // so we have to store and compare start and end points directly.
      nm.rangeStartContainer = nm.range.startContainer;
      nm.rangeEndContainer = nm.range.endContainer;
      nm.rangeStartOffset = nm.range.startOffset;
      nm.rangeEndOffset = nm.range.endOffset;
      if (!sameRange(nm, lm)) {
        dispatchEvent(frame, 'experimental:selection', nm);
      }
    } else if (lm.string) {
      dispatchEvent(frame, 'experimental:deselection', lm);
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


  function dispatchEvent(elem, evtType, data) {
    var evt = document.createEvent("Events");
    evt.initEvent(evtType, false, false);
    evt.m = data;
    return elem.dispatchEvent(evt);
  }


  function textSelected(evt) {
    console.log("Selection: "+evt.m.string);
    var st = document.getElementById('statusSelect');
    var sel = evt.m.string;
    st.innerHTML = sel;
    st.style.visibility = 'visible';
  }


  function textDeselected(evt) {
    console.log("Deselection.");
    var st = document.getElementById('statusSelect');
    st.style.visibility = 'hidden';
  }


  function deselectAction(evt) {
    evt.preventDefault();
    deselect();
  }


  // We've tried a few things under iOS. removeAllRanges() actually works,
  // inasmuch as getSelection().toString() will return nothing, but
  // visually the text still appears highlighted with the iOS selection menu.
  //
  // Creating the dummy input and calling setSelectedRange() on it almost
  // works -- the text is deselected, but the selection menu is still visible,
  // and there's a weird phantom selection elsewhere on the page.
  //
  // Experiments with focusing a dummy contenteditable div proved fruitless.
  //
  // The method below works, but is nasty, because it will scroll and zoom
  // the viewport to the input's location. Hence, we temporarily prevent the
  // viewport from zooming, and immediately return to our scroll position
  // after focusing the input.
  //
  function deselect() {
    var frame = document.getElementById('reader');
    var win = frame.contentWindow;

    if (!win.getSelection().toString()) { return; }

    if (navigator.userAgent.match(/AppleWebKit.*Mobile/)) {
      console.log('Removing selection for iOS');
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
    } else {
      console.log('Removing selection for normal browsers');
    }

    var sel = win.getSelection();
    sel.removeAllRanges();
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

    if (ovp) {
      var ovpcontent = ovp.getAttribute('content');
      var re = /user-scalable\s*=\s*([^,$\s])*/;
      var result = ovpcontent.match(re);
      if (result && ['no', '0'].indexOf(result[1]) >= 0) {
        console.log("Existing viewport is already non-scalable.");
        fn();
      } else {
        console.log("Replacing existing viewport with non-scalable one.");
        var nvpcontent = ovpcontent.replace(re, '');
        nvpcontent += nvpcontent ? ', ' : '';
        nvpcontent += 'user-scalable=no';
        head.removeChild(ovp);
        var nvp = createViewportMeta(nvpcontent);
        fn();
        head.removeChild(nvp);
        head.appendChild(ovp);
      }
    } else {
      console.log("Creating a non-scalable viewport.");
      var nvp = createViewportMeta('user-scalable=no');
      fn();
      nvp.setAttribute('content', 'user-scalable=yes');
    }
  }


  window.onload = init;

})();
