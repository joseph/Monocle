Monocle.Controls.Scrubber = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Scrubber(reader);
  }

  // Constants.
  var k = {
  }

  // Properties.
  var p = {
    divs: {}
  }

  // Public methods and properties.
  var API = {
    constructor: Monocle.Controls.Scrubber,
    constants: k,
    properties: p
  }


  function initialize() {
    p.reader = reader;
    p.book = p.reader.getBook();
    p.reader.addListener('monocle:turn', updateNeedles);
    updateNeedles();
  }


  function calcLeftBound(cntr) {
    if (p.rightBound == cntr.offsetWidth) {
      return;
    }
    p.rightBound = cntr.offsetWidth;
    p.leftBound = p.reader.properties.boxDimensions.left;
    var box = cntr;
    while (box && box != p.reader.properties.divs.box) {
      p.leftBound += box.offsetLeft;
      box = box.parentNode;
    }
  }


  function rebaseX(evt, cntr) {
    calcLeftBound(cntr);
    var x = evt.pageX;
    if (evt.changedTouches) {
      x = evt.changedTouches[0].pageX;
    }
    return Math.max(Math.min(p.rightBound, x - p.leftBound), 0);
  }


  function pixelToPlace(x, cntr) {
    if (!p.componentIds) {
      p.componentIds = p.reader.getBook().properties.componentIds;
      p.componentWidth = 100 / p.componentIds.length;
    }
    var pc = (x / cntr.offsetWidth) * 100;
    var cmpt = p.componentIds[Math.floor(pc / p.componentWidth)];
    var cmptPc = ((pc % p.componentWidth) / p.componentWidth);
    return { componentId: cmpt, percentageThrough: cmptPc };
  }


  function placeToPixel(place, cntr) {
    if (!p.componentIds) {
      p.componentIds = p.reader.getBook().properties.componentIds;
      p.componentWidth = 100 / p.componentIds.length;
    }
    var componentIndex = p.componentIds.indexOf(place.componentId());
    var pc = p.componentWidth * componentIndex;
    pc += place.percentageThrough() * p.componentWidth;
    return Math.round((pc / 100) * cntr.offsetWidth);
  }


  function updateNeedles() {
    if (p.hidden || !p.divs.container) {
      return;
    }
    var place = p.reader.getPlace();
    var x = placeToPixel(place, p.divs.container[0]);
    for (var i = 0; i < p.divs.needle.length; ++i) {
      setX(p.divs.needle[i], x - p.divs.needle[i].offsetWidth / 2);
    }
  }


  function eventType(str) {
    var evtTypeMap;
    if (typeof Touch == "object") {
      evtTypeMap = {
        "start": "touchstart",
        "move": "touchmove",
        "end": "touchend"
      }
    } else {
      evtTypeMap = {
        "start": "mousedown",
        "move": "mousemove",
        "end": "mouseup"
      }
    }
    return evtTypeMap[str];
  }


  function createDivNamed(name, parentNode) {
    var div = document.createElement('div');
    div.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Scrubber[name]
    );
    if (parentNode) {
      parentNode.appendChild(div)
    }
    p.divs[name] = p.divs[name] || [];
    p.divs[name].push(div);

    return div;
  }


  function setX(node, x) {
    x = Math.min(p.divs.container[0].offsetWidth - node.offsetWidth, x);
    x = Math.max(x, 0);
    node.style.webkitTransform =
      node.style.MozTransform =
        "translateX(" + x + "px)";
  }


  function createControlElements() {
    var cntr = createDivNamed('container');
    var track = createDivNamed('track', cntr);
    var needle = createDivNamed('needle', cntr);
    var bubble = createDivNamed('bubble', cntr);

    var moveEvt = function (evt, x) {
      evt.stopPropagation();
      evt.preventDefault();
      x = x || rebaseX(evt, cntr);
      var place = pixelToPlace(x, cntr);
      setX(needle, x - needle.offsetWidth / 2);
      var chps = p.book.chaptersForComponent(place.componentId);
      var cmptIndex = p.componentIds.indexOf(place.componentId);
      var chp = chps[Math.floor(chps.length * place.percentageThrough)];
      if (cmptIndex > -1 && p.book.properties.components[cmptIndex]) {
        var actualPlace = Monocle.Place.FromPercentageThrough(
          p.book.properties.components[cmptIndex],
          place.percentageThrough
        );
        chp = actualPlace.chapterInfo() || chp;
      }

      if (chp) {
        bubble.innerHTML = chp.title;
      }
      setX(bubble, x - bubble.offsetWidth / 2);

      p.lastX = x;
      return place;
    }

    var endEvt = function (evt) {
      var place = moveEvt(evt, p.lastX);
      p.reader.moveTo({
        percent: place.percentageThrough,
        componentId: place.componentId
      });
      Monocle.removeListener(cntr, eventType('move'), moveEvt);
      Monocle.removeListener(document.body, eventType('end'), endEvt);
      bubble.style.display = "none";
    }

    Monocle.addListener(
      cntr,
      eventType("start"),
      function (evt) {
        bubble.style.display = "block";
        moveEvt(evt);
        Monocle.addListener(cntr, eventType('move'), moveEvt);
        Monocle.addListener(document.body, eventType("end"), endEvt);
      }
    );

    return cntr;
  }

  API.createControlElements = createControlElements;
  API.updateNeedles = updateNeedles;

  initialize();

  return API;
}


Monocle.Styles.Controls.Scrubber = {
  container: {
    "position": "absolute",
    "left": "1em",
    "right": "1em",
    "bottom": "8px",
    "height": "30px",
    "background": "#FFF",
    "-webkit-transform-style": "preserve-3d"
  },
  track: {
    "margin-top": "13px",
    "border-top": "2px groove #CCC",
    "-webkit-transform-style": "preserve-3d"
  },
  needle: {
    "position": "absolute",
    "width": "1px",
    "height": "12px",
    "top": "7px",
    "border": "2px solid #777",
    "-webkit-transform-style": "preserve-3d"
  },
  bubble: {
    "position": "absolute",
    "bottom": "2.5em",
    "background": "rgba(0, 0, 0, 0.9)",
    "-webkit-box-shadow": "2px 2px 8px #000",
    //"-moz-box-shadow": "2px 2px 8px #000",
    "-webkit-border-radius": "10px",
    "-moz-border-radius": "10px",
    "padding": "12px",
    "display": "none",
    "font": "bold 12px Lucida Grande, Helvetica, sans-serif",
    "color": "#CCC",
    "text-shadow": "1px 1px #333",
    "white-space": "nowrap",
    "min-width": "8em",
    "max-width": "12em",
    "text-overflow": "ellipsis",
    "overflow": "hidden",
    "-webkit-transform-style": "preserve-3d"
  }
}

