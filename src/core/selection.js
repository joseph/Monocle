Monocle.Selection = function (reader) {
  var API = { constructor: Monocle.Selection };
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader
  };


  // Given a window object, remove any user selections within. Trivial in
  // most browsers, but involving major mojo on iOS.
  //
  function deselect(win) {
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
    } else {
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
        fn();
      } else {
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
      var nvp = createViewportMeta('user-scalable=no');
      fn();
      nvp.setAttribute('content', 'user-scalable=yes');
    }
  }


  function anythingSelected(win) {
    return !win.getSelection().isCollapsed;
  }


  API.deselect = deselect;

  return API;
}
