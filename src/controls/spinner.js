Monocle.Controls.Spinner = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Spinner(reader);
  }

  var API = { constructor: Monocle.Controls.Spinner }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    divs: [],
    spinCount: 0
  }


  function createControlElements(cntr) {
    var anim = cntr.dom.make('div', 'controls_spinner_anim');
    anim.style.backgroundImage = "url(" + k.imgURI + ")";
    p.divs.push(anim);
    return anim;
  }


  // Registers spin/spun event handlers for: loading,componentchanging,resizing.
  function listenForUsualDelays() {
    p.reader.listen('monocle:componentloading', spin);
    p.reader.listen('monocle:componentloaded', spun);
    p.reader.listen('monocle:componentchanging', spin);
    p.reader.listen('monocle:componentchange', spun);
    p.reader.listen('monocle:resizing', resizeSpin);
    p.reader.listen('monocle:resize', resizeSpun);
    p.reader.listen('monocle:stylesheetchanging', spin);
    p.reader.listen('monocle:stylesheetchange', spun);
  }


  function resizeSpin(evt) {
    if (p.resizing) {
      return;
    }
    spin(evt);
    p.resizing = true;
  }


  function resizeSpun(evt) {
    spun(evt);
    p.resizing = false;
  }


  function spin(evt) {
    console.log('Spinning on ' + (evt ? evt.type : 'unknown'));
    p.spinCount += 1;
    if (!p.reader) {
      return;
    }
    p.reader.showControl(API);
    var pNode = evt && evt.m.page ? evt.m.page : null;
    for (var i = 0; i < p.divs.length; ++i) {
      p.divs[i].style.display =
        (!pNode || pNode == p.divs[i].parentNode.parentNode) ? 'block' : 'none'
    }
  }


  function spun(evt) {
    console.log('Spun on ' + (evt ? evt.type : 'unknown'));
    p.spinCount -= 1;
    if (p.spinCount > 0 || !p.reader) {
      return;
    }
    p.reader.hideControl(API);
  }

  API.createControlElements = createControlElements;
  API.listenForUsualDelays = listenForUsualDelays;
  API.spin = spin;
  API.spun = spun;

  return API;
}

// FIXME: move to stylesheet
Monocle.Controls.Spinner.imgURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAA0CAMAAAANBM47AAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAsSAAALEgHS3X78AAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M1cbXjNgAAABV0RVh0Q3JlYXRpb24gVGltZQAxNy81LzEwnOhoKAAAAE5QTFRFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxKKmWQAAABp0Uk5TAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBl0wLilAAAC8klEQVQYGZXBB2LjOAADQFCimtVFEoD//9HLbrJxipzoZoBToYptUwV8V/Xrsc8RP6i7aduPXHI69mWIAR9UY6Is5rnCuTBsWXeLkijbTFOLf7okW6R8zxEnwphskfIrifJdW4u/RtlpbGLsdjoHfDNkSZTSNg192w3jchSJEtcawCRzDvgjLPINX1SbSSvNXcC7eNuLXpQuTFbp8CZkH/isyS68H0PAF+0iUzxoNni33HPAR51UxDHgRLObslLEw3TPFT7oKPqIeOImURs+WJ0CHlqKXgLOxL4NgyRqxbuqeMNDXURPOBNWSokquRRP+GeVOzwcLlpwJmx3WVJuY2ZRi1ezfOBhdNGGU52ZhrloBzqSucKLerdLxLtIKlc4Nd9LA6wuNTC5aAbQZzs3eFhE9Tg3mw2wqkQgHCZrTJK3iIcoasMTvXX0E30EAK2k+Wbrho8mky2eCLslSz3+2ERKucVHIZsbnqp2WWXEX60ossMnrakeP+jGocabg9SGzyaXHHDRpOIO/zRjDWCTNlzVsLjFm4bODapE33BZoke8mVy8oqXY4rLNXvFmEnXDKJYaly3SjlchkSOwiCngstFMeDXLE4CVygGX3e6FawUgzFIKANbiHHDZ7U4qL7c5SWzxYqFywGXjvVD3F3Zu8ccs5gqXzeYx7CTTWOOvnmTEZZu0ItSxrvAmZrrHZYme8dkhLbiqLkUDPlvMA1cNIiM+613Y4KJNSviiprTgmrrQM75arVzhkllUxFetqBlXVEXa8d0hMeKCxVSH73rRG37XidpxZlXRiN9UhYUtztRFVI+fhUPFE851KlSHn4TNxTueGU2yx3PVbipVeGpxIaeAJ2IynRv8YHEp3iNOjRRdGvxotGjONb7pD7M4RfyiK6ZclhYf1bdDprRW+FW9SZSUlqGtq1BVTTftRaKce1zS7bIpWyW/oK0i38tU4apupWyRsijKVhoj/o+6W45cJEoqaR+bgP8txH5a1nUZ2gq/+Q/51T5MhuG3fQAAAABJRU5ErkJggg==";

Monocle.pieceLoaded('controls/spinner');
