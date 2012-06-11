Monocle.Billboard = function (reader) {
  var API = { constructor: Monocle.Billboard };
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    cntr: null
  };


  function show(urlOrElement, options) {
    p.reader.dispatchEvent('monocle:magic:stop');
    if (p.cntr) { return console.warn("Modal billboard already showing."); }

    var options = options || {};
    var elem = urlOrElement;
    var inner = null;
    p.cntr = reader.dom.append('div', k.CLS.cntr);
    if (typeof urlOrElement == 'string') {
      var url = urlOrElement;
      inner = elem = p.cntr.dom.append('iframe', k.CLS.inner);
      elem.setAttribute('src', url);
    } else {
      inner = p.cntr.dom.append('div', k.CLS.inner);
      inner.appendChild(elem);
    }
    if (options.closeButton != false) {
      var cBtn = p.cntr.dom.append('div', k.CLS.closeButton);
      Monocle.Events.listenForTap(cBtn, hide);
    }
    if (options.scrollTo == 'center') {
      inner.scrollLeft = (inner.scrollWidth - inner.offsetWidth) / 2;
      inner.scrollTop = (inner.scrollHeight - inner.offsetHeight) / 2;
      if (inner.offsetHeight > elem.offsetHeight) {
        inner.style.paddingTop = (inner.offsetHeight-elem.offsetHeight)/2+'px';
      }
      if (inner.offsetWidth > elem.offsetWidth) {
        inner.style.paddingLeft = (inner.offsetWidth-elem.offsetWidth)/2+'px';
      }
    } else {
      inner.scrollLeft = 1;
    }
    shrink(options.from);
    Monocle.defer(grow);
  }


  function hide(evt) {
    shrink();
    p.reader.dispatchEvent('monocle:magic:init');
    Monocle.Events.afterTransition(p.cntr, remove);
  }


  function grow() {
    Monocle.Styles.transitionFor(p.cntr, 'transform', 300, 'ease-in');
    Monocle.Styles.affix(p.cntr, 'transform', 'translate(0, 0) scale(1)');
  }


  function shrink(from) {
    p.from = from || p.from || [0,0];
    var x = p.from[0]+'px';
    var y = p.from[1]+'px';
    Monocle.Styles.affix(
      p.cntr,
      'transform',
      'translate('+x+','+y+') scale(0)'
    );
  }


  function remove () {
    p.cntr.parentNode.removeChild(p.cntr);
    p.cntr = null;
    p.reader.dispatchEvent('monocle:magic:init');
  }


  API.show = show;
  API.hide = hide;

  return API;
}

Monocle.Billboard.CLS = {
  cntr: 'billboard_container',
  inner: 'billboard_inner',
  closeButton: 'billboard_close'
}
