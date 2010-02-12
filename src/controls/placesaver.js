Carlyle.Controls.PlaceSaver = function (reader) {
  if (Carlyle.Controls == this) {
    return new Carlyle.Controls.PlaceSaver(reader);
  }

  // Properties.
  var p = {
  }


  // Public methods and properties.
  var API = {
    constructor: Carlyle.Controls.PlaceSaver,
    properties: p
  }


  function initialize() {
    var box = reader.properties.divs.box;
    p.prefix = "carlyle.controls.placesaver." + box.id + ".";
    box.addEventListener('carlyle:turn', savePlaceToCookie, true);
  }


  function setCookie(key, value) {
    document.cookie = p.prefix + key + " = " + value;
    return value;
  }


  function getCookie(key) {
    if (!document.cookie) {
      return null;
    }
    var regex = new RegExp(p.prefix + key + "=(.+?)(;|$)");
    var matches = document.cookie.match(regex);
    if (matches) {
      return matches[1];
    } else {
      return null;
    }
  }


  function savePlaceToCookie() {
    var place = reader.getPlace();
    setCookie("component", encodeURIComponent(place.componentId()));
    setCookie("percent", place.percentageThrough());
  }


  function savedPlace() {
    var place = {
      component: getCookie('component'),
      percent: getCookie('percent')
    }
    if (place.component && place.percent) {
      place.component = decodeURIComponent(place.component);
      place.percent = parseFloat(place.percent);
      return place;
    } else {
      return null;
    }
  }


  function restorePlace() {
    var place = savedPlace();
    if (place) {
      reader.moveToPercentageThrough(place.percent, place.component);
    }
  }


  API.savedPlace = savedPlace;
  API.restorePlace = restorePlace;

  initialize();

  return API;
}
