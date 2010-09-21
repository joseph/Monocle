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
    p.reader.listen('monocle:turn', updateNeedles);
    updateNeedles();
  }


  /* FIXME: evt.m.offsetX should make these redundant, right */

  function calcLeftBound(cntr) {
    if (p.rightBound == cntr.offsetWidth) {
      return;
    }
    p.rightBound = cntr.offsetWidth;
    p.leftBound = p.reader.properties.boxDimensions.left;
    var box = cntr;
    while (box && box != p.reader.dom.find('box')) {
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
    if (p.hidden || !p.reader.dom.find(k.CLS.container)) {
      return;
    }
    var place = p.reader.getPlace();
    var x = placeToPixel(place, p.reader.dom.find(k.CLS.container));
    var needle, i = 0;
    while (needle = p.reader.dom.find(k.CLS.needle, i)) {
      setX(needle, x - needle.offsetWidth / 2);
      p.reader.dom.find(k.CLS.trail, i).style.width = x + "px";
      i += 1;
    }
  }


  function setX(node, x) {
    var cntr = p.reader.dom.find(k.CLS.container);
    x = Math.min(cntr.offsetWidth - node.offsetWidth, x);
    x = Math.max(x, 0);
    Monocle.Styles.affix(node, 'transform', 'translateX('+x+'px)');
  }


  function createControlElements(holder) {
    var cntr = holder.dom.make('div', k.CLS.container);
    var track = cntr.dom.append('div', k.CLS.track);
    var needle = cntr.dom.append('div', k.CLS.needle);
    var needleTrail = cntr.dom.append('div', k.CLS.trail);
    var bubble = cntr.dom.append('div', k.CLS.bubble);

    var listeners;

    var moveEvt = function (evt, x) {
      x = x || rebaseX(evt, cntr);
      var place = pixelToPlace(x, cntr);
      setX(needle, x - needle.offsetWidth / 2);
      var book = p.reader.getBook();
      var chps = book.chaptersForComponent(place.componentId);
      var cmptIndex = p.componentIds.indexOf(place.componentId);
      var chp = chps[Math.floor(chps.length * place.percentageThrough)];
      if (cmptIndex > -1 && book.properties.components[cmptIndex]) {
        var actualPlace = Monocle.Place.FromPercentageThrough(
          book.properties.components[cmptIndex],
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
      Monocle.Events.deafenForContact(document.body, listeners);
      bubble.style.display = "none";
    }

    var startFn = function (evt) {
      bubble.style.display = "block";
      moveEvt(evt);
      listeners = Monocle.Events.listenForContact(
        document.body,
        { move: moveEvt, end: endEvt }
      );
    }

    Monocle.Events.listenForContact(cntr, { start: startFn });

    return cntr;
  }


  API.createControlElements = createControlElements;
  API.updateNeedles = updateNeedles;

  initialize();

  return API;
}

Monocle.Controls.Scrubber.CLS = {
  container: 'controls_scrubber_container',
  track: 'controls_scrubber_track',
  needle: 'controls_scrubber_needle',
  trail: 'controls_scrubber_trail',
  bubble: 'controls_scrubber_bubble'
}

Monocle.pieceLoaded('controls/scrubber');
