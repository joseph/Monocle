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
    if (typeof urlOrElement == 'string') {
      var url = urlOrElement;
      elem = reader.dom.make('iframe');
      elem.setAttribute('src', url);
    }
    p.cntr = reader.dom.append('div', k.CLS.cntr);
    p.cntr.appendChild(elem);
    if (options.closeButton != false) {
      var cBtn = p.cntr.dom.append('div', k.CLS.closeButton);
      Monocle.Events.listen(cBtn, 'click', hide);
    }
  }


  function hide() {
    p.cntr.parentNode.removeChild(p.cntr);
  }


  API.show = show;
  API.hide = hide;

  return API;
}

Monocle.Billboard.CLS = {
  cntr: 'billboard_container',
  closeButton: 'billboard_close'
}
