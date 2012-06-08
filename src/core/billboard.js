Monocle.Billboard = function (reader) {
  var API = { constructor: Monocle.Billboard };
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    cntr: null
  };


  function show(urlOrElement, options) {
    var options = options || {};
    var elem = urlOrElement;
    p.cntr = reader.dom.append('div', k.CLS.cntr);
    if (typeof urlOrElement == 'string') {
      var url = urlOrElement;
      p.inner = elem = p.cntr.dom.append('iframe', k.CLS.inner);
      elem.setAttribute('src', url);
    } else {
      p.inner = p.cntr.dom.append('div', k.CLS.inner);
      p.inner.appendChild(elem);
    }
    if (options.closeButton != false) {
      var cBtn = p.cntr.dom.append('div', k.CLS.closeButton);
      Monocle.Events.listenForTap(cBtn, hide);
    }
    if (options.scrollTo == 'center') {
      p.inner.scrollLeft = (p.inner.scrollWidth - p.inner.offsetWidth) / 2;
      p.inner.scrollTop = (p.inner.scrollHeight - p.inner.offsetHeight) / 2;
      if (p.inner.offsetHeight > elem.offsetHeight) {
        p.inner.style.paddingTop = (p.inner.offsetHeight - elem.offsetHeight) / 2 + 'px';
      }
    } else {
      p.inner.scrollLeft = 1;
    }
    shrink(options.from);
    p.reader.dispatchEvent('monocle:magic:stop');
    Monocle.defer(grow);
  }


  function hide(evt) {
    shrink();
    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }
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
    Monocle.Styles.affix(p.cntr, 'transform', 'translate('+x+','+y+') scale(0)');
  }


  function remove () {
    p.cntr.parentNode.removeChild(p.cntr);
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
