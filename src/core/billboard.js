Monocle.Billboard = function (reader) {
  var API = { constructor: Monocle.Billboard };
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    cntr: null
  };


  function show(urlOrElement, options) {
    p.reader.dispatchEvent('monocle:modal:on');
    if (p.cntr) { return console.warn("Modal billboard already showing."); }

    options = options || {};
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
    p.dims = [
      elem.naturalWidth || elem.offsetWidth,
      elem.naturalHeight || elem.offsetHeight
    ];
    if (options.closeButton !== false) {
      var cBtn = p.cntr.dom.append('div', k.CLS.closeButton);
      Monocle.Events.listenForTap(cBtn, hide);
    }
    align(options.align || 'left top');
    p.reader.listen('monocle:resize', align);

    shrink(options.from);
    Monocle.defer(grow);
  }


  function hide(evt) {
    shrink();
    Monocle.Events.afterTransition(p.cntr, remove);
  }


  function grow() {
    Monocle.Styles.transitionFor(p.cntr, 'transform', k.ANIM_MS, 'ease-in-out');
    Monocle.Styles.affix(p.cntr, 'transform', 'translate(0, 0) scale(1)');
  }


  function shrink(from) {
    p.from = from || p.from || [0,0];
    var translate = 'translate('+p.from[0]+'px, '+p.from[1]+'px)';
    var scale = 'scale(0)';
    if (typeof p.from[2] === 'number') {
      scale = 'scaleX('+(p.from[2] / p.cntr.offsetWidth)+') ';
      scale += 'scaleY('+(p.from[3] / p.cntr.offsetHeight)+')';
    }
    Monocle.Styles.affix(p.cntr, 'transform', translate+' '+scale);
  }


  function remove () {
    p.cntr.parentNode.removeChild(p.cntr);
    p.cntr = p.inner = null;
    p.reader.deafen('monocle:resize', align);
    p.reader.dispatchEvent('monocle:modal:off');
  }


  function align(loc) {
    p.alignment = (typeof loc == 'string') ? loc : p.alignment;
    if (!p.alignment) { return; }
    if (p.dims[0] > p.inner.offsetWidth || p.dims[1] > p.inner.offsetHeight) {
      p.cntr.dom.addClass(k.CLS.oversized);
    } else {
      p.cntr.dom.removeClass(k.CLS.oversized);
    }

    var s = p.alignment.split(/\s+/);
    var l = 0, t = 0;
    var w = (p.inner.scrollWidth - p.inner.offsetWidth);
    var h = (p.inner.scrollHeight - p.inner.offsetHeight);
    if (s[0].match(/^\d+$/)) {
      l = Math.max(0, parseInt(s[0], 10) - (p.inner.offsetWidth / 2));
    } else if (s[0] == 'center') {
      l = w / 2;
    } else if (s[0] == 'right') {
      l = w;
    }
    if (s[1] && s[1].match(/^\d+$/)) {
      t = Math.max(0, parseInt(s[1], 10) - (p.inner.offsetHeight / 2));
    } else if (!s[1] || s[1] == 'center') {
      t =  h / 2;
    } else if (s[1] == 'bottom') {
      t = h;
    }
    p.inner.scrollLeft = l;
    p.inner.scrollTop = t;
  }


  API.show = show;
  API.hide = hide;
  API.align= align;

  return API;
}


Monocle.Billboard.CLS = {
  cntr: 'billboard_container',
  inner: 'billboard_inner',
  closeButton: 'billboard_close',
  oversized: 'billboard_oversized'
}

Monocle.Billboard.ANIM_MS = 400;
