Monocle.Controls.Scrubber = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Scrubber(reader);
  }

  var API = { constructor: Monocle.Controls.Scrubber }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    divs: {}
  }


  function initialize() {
    p.reader = reader;
    p.book = p.reader.getBook();
    p.reader.listen('monocle:turn', updateNeedles);
    updateNeedles();
  }


  function calcTopBound(track) {
    if (p.bottomBound == track.offsetHeight) {
      return;
    }
    p.bottomBound = track.offsetHeight;
    var ot = track.offsetTop;
    var node = track.parentNode;
    while (node) {
      if (node.offsetTop) {
        ot += node.offsetTop;
      }
      node = node.parentNode;
    }
    p.topBound = ot + 8; // FIXME: track border + needle margin
  }


  function rebaseY(evt, track) {
    calcTopBound(track);
    var y = evt.pageY;
    if (evt.changedTouches) {
      y = evt.changedTouches[0].pageY;
    }
    return Math.max(Math.min(p.bottomBound, y - p.topBound), 0);
  }


  function pixelToPlace(y, track) {
    primeComponentIds();
    var pc = (y / track.offsetHeight) * 100;
    var cmpt = p.componentIds[Math.floor(pc / p.componentHeight)];
    var cmptPc = ((pc % p.componentHeight) / p.componentHeight);
    return { componentId: cmpt, percentageThrough: cmptPc };
  }


  function placeToPixel(place, track) {
    primeComponentIds();
    var componentIndex = p.componentIds.indexOf(place.componentId());
    var pc = p.componentHeight * componentIndex;
    pc += place.percentageThrough() * p.componentHeight;
    return Math.round((pc / 100) * track.offsetHeight);
  }


  function primeComponentIds() {
    if (!p.componentIds) {
      p.componentIds = p.reader.getBook().properties.componentIds;
      p.componentHeight = 100 / p.componentIds.length;
    }
  }


  function updateNeedles() {
    if (p.hidden || !p.divs.track) {
      return;
    }
    var place = p.reader.getPlace();
    var track = p.divs.track[0];
    var y = placeToPixel(place, track);
    for (var i = 0; i < p.divs.needle.length; ++i) {
      var halfHeight = p.divs.needle[i].offsetHeight / 2;
      setY(p.divs.needle[i], y - halfHeight);
      // FIXME: remove these magic numbers
      p.divs.needleTrail[i].style.height =
        Math.min((track.offsetHeight + 17 - y), track.offsetHeight - 8) + "px";
      updateBubbleWithPlace(
        p.divs.bubble[i],
        {
          componentId: place.componentId(),
          percentageThrough: place.percentageThrough()
        }
      );
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
    y = Math.min(p.divs.track[0].offsetHeight - node.offsetHeight, y);
    y = Math.max(y, 0);
    node.style.webkitTransform =
      node.style.MozTransform =
        "translateY(" + y + "px)";
  }


  function createControlElements() {
    var cntr = createDivNamed('container');
    var track = createDivNamed('track', cntr);
    var needleTrail = createDivNamed('needleTrail', track);
    var needle = createDivNamed('needle', track);
    var bubble = createDivNamed('bubble', cntr);

    var listeners;

    var deafenListeners = function () {
      if (!listeners) {
        return;
      }
      Monocle.Events.deafenForContact(track, listeners);
      listeners = null;
    }

    var startEvt = function (evt) {
      moveEvt(evt);
      deafenListeners();
      listeners = Monocle.Events.listenForContact(
        track,
        {
          move: moveEvt,
          end: endEvt
        }
      );
    }

    var moveEvt = function (evt, y) {
      evt.stopPropagation();
      evt.preventDefault();
      y = y || rebaseY(evt, track);
      setY(needle, y - needle.offsetHeight / 2);
      var place = pixelToPlace(y, track);
      updateBubbleWithPlace(bubble, place);
      p.lastY = y;
      return place;
    }

    var endEvt = function (evt) {
      var place = moveEvt(evt, p.lastY);
      p.reader.moveTo({
        percent: place.percentageThrough,
        componentId: place.componentId
      });
      deafenListeners();
    }

    Monocle.Events.listenForContact(track, { start: startEvt });

    return cntr;
  }


  function updateBubbleWithPlace(bubble, place) {
    primeComponentIds();
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
      if (!bubble.chapterTitle) {
        var bCT = createDivNamed("bubbleChapterTitle", bubble);
        bCT.appendChild(bubble.chapterTitle = document.createTextNode(''));
        var bCP = createDivNamed("bubbleChapterPage", bubble);
        bCP.appendChild(bubble.chapterPage = document.createTextNode(''));
      }

      bubble.chapterTitle.nodeValue = chp.title;
      if (actualPlace) {
        bubble.chapterPage.nodeValue = "Page " + actualPlace.pageNumber();
        bubble.chapterPage.parentNode.style.visibility = "visible";
      } else {
        bubble.chapterPage.parentNode.style.visibility = "hidden";
      }
    }
  }


  API.createControlElements = createControlElements;
  API.updateNeedles = updateNeedles;

  initialize();

  return API;
}


Monocle.Styles.Controls.Scrubber = {
  container: {
    "width": "100%",
    "height": "100%"
  },
  track: {
    "position": "relative",
    "margin": "0 20px 0 auto",
    "width": "52px",
    "height": "98%",
    "-webkit-border-radius": "26px",
    "-moz-border-radius": "26px",
    "border-radius": "100px",
    "border": "3px solid #333",
    "opacity": "0.7"
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
    "bottom": "0",
    "background": "#333",
    "opacity": "0.67",
    "-webkit-border-radius": "24px",
    "-moz-border-radius": "24px",
    "margin": "1px",
    "width": "50px",
    "height": "50px",
    "-webkit-transition": "height ease-in 100ms"
  },
  bubble: {
    "position": "absolute",
    "top": "2%",
    "left": "0",
    "margin-right": "75px",
    "display": "block",
    "background": "rgba(245,245,245,0.65)",
    "padding": "0.2em 1em",
    "-webkit-border-radius": "6px"
  },
  bubbleChapterTitle: {
    "font-weight": "bold"
  },
  bubbleChapterPage: {
    "font": "9pt Helvetica, Arial, sans-serif"
  }
}


Monocle.pieceLoaded('controls/scrubber');
