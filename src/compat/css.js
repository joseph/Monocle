Monocle.CSS = function () {

  var API = { constructor: Monocle.CSS }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    guineapig: document.createElement('div')
  }


  function toDOMProps(prop) {
    var parts = prop.split('-');
    for (var i = parts.length; i > 0; --i) {
      parts[i] = capStr(parts[i]);
    }

    var props = [parts.join('')];
    var eng = k.engines.indexOf(Monocle.Browser.engine);
    if (eng) {
      var pf = k.domprefixes[eng];
      if (pf) {
        parts[0] = capStr(parts[0]);
        props.push(pf+parts.join(''));
      }
    }
    return props;
  }


  function supportsProperty(props) {
    for (var i in props) {
      if (p.guineapig.style[props[i]] !== undefined) { return true; }
    }
    return false;
  } // Thanks modernizr!



  function supportsPropertyWithAnyPrefix(prop) {
    return supportsProperty(toDOMProps(prop));
  }


  function supportsMediaQuery(query) {
    var gpid = "monocle_guineapig";
    p.guineapig.id = gpid;
    var st = document.createElement('style');
    st.textContent = query+'{#'+gpid+'{height:3px}}';
    (document.head || document.getElementsByTagName('head')[0]).appendChild(st);
    document.documentElement.appendChild(p.guineapig);

    var result = p.guineapig.offsetHeight === 3;

    st.parentNode.removeChild(st);
    p.guineapig.parentNode.removeChild(p.guineapig);

    return result;
  } // Thanks modernizr!


  function supportsMediaQueryProperty(prop) {
    return supportsMediaQuery(
      '@media (' + k.prefixes.join(prop+'),(') + 'monocle__)'
    );
  }


  function capStr(wd) {
    return wd ? wd.charAt(0).toUpperCase() + wd.substr(1) : "";
  }


  API.toDOMProps = toDOMProps;
  API.supportsProperty = supportsProperty;
  API.supportsPropertyWithAnyPrefix = supportsPropertyWithAnyPrefix;
  API.supportsMediaQuery = supportsMediaQuery;
  API.supportsMediaQueryProperty = supportsMediaQueryProperty;

  return API;
}


Monocle.CSS.engines = ["W3C", "WebKit", "Gecko", "Opera", "IE", "Konqueror"];
Monocle.CSS.prefixes = ["", "-webkit-", "-moz-", "-o-", "-ms-", "-khtml-"];
Monocle.CSS.domprefixes = ["", "Webkit", "Moz", "O", "ms", "Khtml"];


Monocle.pieceLoaded('compat/css');
