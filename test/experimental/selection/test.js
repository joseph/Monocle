(function () {

  var SELECTION_POLLING_INTERVAL = 250;


  function init() {
    setInterval(pollSelection, SELECTION_POLLING_INTERVAL);
    var btn = document.getElementById('deselectBtn');
    btn.addEventListener('mousedown', deselectAction, false);
    btn.addEventListener('touchstart', deselectAction, false);
  }


  function pollSelection() {
    var st = document.getElementById('statusSelect');
    var frame = document.getElementById('reader');
    var sel = frame.contentWindow.getSelection().toString();
    if (sel) {
      if (sel != st.innerHTML) {
        st.innerHTML = sel;
        st.style.visibility = 'visible';
      }
    } else {
      st.style.visibility = 'hidden';
    }
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
      var re = /user-scalable\s*=\s*([^,$])*/;
      var result = ovpcontent.match(re);
      if (result && ['no', '0'].indexOf(result[1]) >= 0) {
        console.log("Existing viewport is already non-scalable.");
        fn();
      } else {
        console.log("Replacing existing viewport with non-scalable one.");
        var nvpcontent = ovpcontent.replace(/user-scalable\s*=\s*[^,$]*/, '');
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
