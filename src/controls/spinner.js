Monocle.Controls.Spinner = function () {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Spinner();
  }

  var k = {
    imgURI: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAA0CAMAAAANBM47AAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAsSAAALEgHS3X78AAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M1cbXjNgAAABV0RVh0Q3JlYXRpb24gVGltZQAxNy81LzEwnOhoKAAAAE5QTFRFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxKKmWQAAABp0Uk5TAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBl0wLilAAAC8klEQVQYGZXBB2LjOAADQFCimtVFEoD//9HLbrJxipzoZoBToYptUwV8V/Xrsc8RP6i7aduPXHI69mWIAR9UY6Is5rnCuTBsWXeLkijbTFOLf7okW6R8zxEnwphskfIrifJdW4u/RtlpbGLsdjoHfDNkSZTSNg192w3jchSJEtcawCRzDvgjLPINX1SbSSvNXcC7eNuLXpQuTFbp8CZkH/isyS68H0PAF+0iUzxoNni33HPAR51UxDHgRLObslLEw3TPFT7oKPqIeOImURs+WJ0CHlqKXgLOxL4NgyRqxbuqeMNDXURPOBNWSokquRRP+GeVOzwcLlpwJmx3WVJuY2ZRi1ezfOBhdNGGU52ZhrloBzqSucKLerdLxLtIKlc4Nd9LA6wuNTC5aAbQZzs3eFhE9Tg3mw2wqkQgHCZrTJK3iIcoasMTvXX0E30EAK2k+Wbrho8mky2eCLslSz3+2ERKucVHIZsbnqp2WWXEX60ossMnrakeP+jGocabg9SGzyaXHHDRpOIO/zRjDWCTNlzVsLjFm4bODapE33BZoke8mVy8oqXY4rLNXvFmEnXDKJYaly3SjlchkSOwiCngstFMeDXLE4CVygGX3e6FawUgzFIKANbiHHDZ7U4qL7c5SWzxYqFywGXjvVD3F3Zu8ccs5gqXzeYx7CTTWOOvnmTEZZu0ItSxrvAmZrrHZYme8dkhLbiqLkUDPlvMA1cNIiM+613Y4KJNSviiprTgmrrQM75arVzhkllUxFetqBlXVEXa8d0hMeKCxVSH73rRG37XidpxZlXRiN9UhYUtztRFVI+fhUPFE851KlSHn4TNxTueGU2yx3PVbipVeGpxIaeAJ2IynRv8YHEp3iNOjRRdGvxotGjONb7pD7M4RfyiK6ZclhYf1bdDprRW+FW9SZSUlqGtq1BVTTftRaKce1zS7bIpWyW/oK0i38tU4apupWyRsijKVhoj/o+6W45cJEoqaR+bgP8txH5a1nUZ2gq/+Q/51T5MhuG3fQAAAABJRU5ErkJggg=="
  }

  var p = {
    divs: [],
    spinCount: 0
  }

  var API = {
    constructor: Monocle.Controls.Spinner,
    constants: k,
    properties: p
  }


  function initialize() {
  }


  function assignToReader(reader) {
    p.reader = reader;
    if (p.spinCount > 0) {
      p.spinCount -= 1;
      spin();
    }
  }


  function createControlElements() {
    var anim = document.createElement('div');
    anim.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Spinner.anim
    );
    anim.style.backgroundImage = "url(" + k.imgURI + ")";
    p.divs.push(anim);
    return anim;
  }


  // Registers spin/spun event handlers for: loading, bookchanging, resizing.
  function listenForUsualDelays(listenToElement) {
    if (!listenToElement) {
      if (p.reader) {
        listenToElement = p.reader.properties.divs.box;
      } else {
        throw("No listenToElement or assigned reader.");
      }
    }
    Monocle.addListener(listenToElement, 'monocle:bookchanging', spin);
    Monocle.addListener(listenToElement, 'monocle:bookchange', spun);
    Monocle.addListener(listenToElement, 'monocle:componentloading', spin);
    Monocle.addListener(listenToElement, 'monocle:componentloaded', spun);
    Monocle.addListener(listenToElement, 'monocle:componentchanging', spin);
    Monocle.addListener(listenToElement, 'monocle:componentchange', spun);
    Monocle.addListener(listenToElement, 'monocle:resizing', resizeSpin);
    Monocle.addListener(listenToElement, 'monocle:resize', resizeSpun);
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
    //console.log('Spinning on ' + (evt ? evt.type : 'unknown'));
    p.spinCount += 1;
    if (!p.reader) {
      return;
    }
    p.reader.showControl(API);
    var pNode = evt && evt.monocleData.page ? evt.monocleData.page : null;
    for (var i = 0; i < p.divs.length; ++i) {
      p.divs[i].style.display =
        (!pNode || pNode == p.divs[i].parentNode.parentNode) ? 'block' : 'none'
    }
  }


  function spun(evt) {
    //console.log('Spun on ' + (evt ? evt.type : 'unknown'));
    p.spinCount -= 1;
    if (p.spinCount > 0 || !p.reader) {
      return;
    }
    p.reader.hideControl(API);
  }

  API.assignToReader = assignToReader;
  API.createControlElements = createControlElements;
  API.listenForUsualDelays = listenForUsualDelays;
  API.spin = spin;
  API.spun = spun;

  initialize();

  return API;
}



Monocle.Styles.Controls.Spinner = {
  anim: {
    "position": "absolute",
    "width": "100%",
    "height": "100%",
    "background-color": "#FFF",
    "background-repeat": "no-repeat",
    "background-position": "center center"
  }
}


Monocle.pieceLoaded('controls/spinner');
