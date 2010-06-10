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


  function calcTopBound(cntr) {
    if (p.bottomBound == cntr.offsetHeight) {
      return;
    }
    p.bottomBound = cntr.offsetHeight;
    p.topBound = p.reader.properties.boxDimensions.top;
    var box = cntr;
    while (box && box != p.reader.properties.divs.box) {
      p.topBound += box.offsetTop;
      box = box.parentNode;
    }
  }


  function rebaseY(evt, cntr) {
    calcTopBound(cntr);
    var y = evt.pageY;
    if (evt.changedTouches) {
      y = evt.changedTouches[0].pageY;
    }
    return Math.max(Math.min(p.bottomBound, y - p.topBound), 0);
  }


  function pixelToPlace(y, cntr) {
    if (!p.componentIds) {
      p.componentIds = p.reader.getBook().properties.componentIds;
      p.componentHeight = 100 / p.componentIds.length;
    }
    var pc = (y / cntr.offsetHeight) * 100;
    var cmpt = p.componentIds[Math.floor(pc / p.componentHeight)];
    var cmptPc = ((pc % p.componentHeight) / p.componentHeight);
    return { componentId: cmpt, percentageThrough: cmptPc };
  }


  function placeToPixel(place, cntr) {
    if (!p.componentIds) {
      p.componentIds = p.reader.getBook().properties.componentIds;
      p.componentHeight = 100 / p.componentIds.length;
    }
    var componentIndex = p.componentIds.indexOf(place.componentId());
    var pc = p.componentHeight * componentIndex;
    pc += place.percentageThrough() * p.componentHeight;
    return Math.round((pc / 100) * cntr.offsetHeight);
  }


  function updateNeedles() {
    if (p.hidden || !p.divs.container) {
      return;
    }
    var place = p.reader.getPlace();
    var y = placeToPixel(place, p.divs.container[0]);
    for (var i = 0; i < p.divs.needle.length; ++i) {
      setY(p.divs.needle[i], y - p.divs.needle[i].offsetHeight / 2);
      p.divs.needleTrail[i].style.height = (y + 25) + "px";
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


  function setY(node, y) {
    y = Math.min(p.divs.container[0].offsetHeight - node.offsetHeight, y);
    y = Math.max(y, 0);
    node.style.webkitTransform =
      node.style.MozTransform =
        "translateY(" + y + "px)";
  }


  function createControlElements() {
    var cntr = createDivNamed('container');
    var track = createDivNamed('track', cntr);
    var needleTrail = createDivNamed('needleTrail', cntr);
    var needle = createDivNamed('needle', cntr);
    var bubble = createDivNamed('bubble', cntr);

    var moveEvt = function (evt, y) {
      evt.stopPropagation();
      evt.preventDefault();
      y = y || rebaseY(evt, cntr);
      var place = pixelToPlace(y, cntr);
      setY(needle, y - needle.offsetHeight / 2);
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
      setY(bubble, y - bubble.offsetHeight / 2);

      p.lastY = y;
      return place;
    }

    var endEvt = function (evt) {
      var place = moveEvt(evt, p.lastY);
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
    "width": "52px",
    "left": "40%",
    "top": "10%",
    "bottom": "10%",
    "-webkit-border-radius": "26px",
    "-moz-border-radius": "26px",
    "border-radius": "100px",
    "border": "3px solid #333"
  },
  track: {
    "width": "100%"
  },
  needle: {
    "position": "absolute",
    "margin": "1px",
    "width": "50px",
    "height": "50px",
    "background": "#333",
    "-webkit-border-radius": "24px",
    "-moz-border-radius": "24px"
  },
  needleTrail: {
    "position": "absolute",
    "background": "#333",
    "opacity": "0.67",
    "-webkit-border-radius": "26px",
    "-moz-border-radius": "26px",
    "margin": "1px",
    "width": "50px",
    "height": "150px"
  },
  bubble: {
    "position": "absolute",
    "background": "rgba(0, 0, 0, 0.9)",
    "-webkit-border-radius": "10px",
    "-moz-border-radius": "10px",
    "left": "-100%",
    "padding": "1em",
    "display": "none",
    "white-space": "nowrap",
    "text-overflow": "ellipsis",
    "overflow": "hidden",
    "-webkit-transform-style": "preserve-3d",
    "min-width": "20%",
    "max-width": "60%",
    "color": "#CCC",
    "font": "bold 12px Lucida Grande, Helvetica, sans-serif"
  }
}


Monocle.pieceLoaded('controls/scrubber');
