Monocle.Controls.Scrubber = function (reader) {

  var API = { constructor: Monocle.Controls.Scrubber }
  var k = API.constants = API.constructor;
  var p = API.properties = {}


  function initialize() {
    p.reader = reader;
    p.reader.listen('monocle:turn', updateNeedles);
    updateNeedles();
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
    for (var i = 0, needle; needle = p.reader.dom.find(k.CLS.needle, i); ++i) {
      setX(needle, x - needle.offsetWidth / 2);
      p.reader.dom.find(k.CLS.trail, i).style.width = x + "px";
    }
  }


  function setX(node, x) {
    var cntr = p.reader.dom.find(k.CLS.container);
    x = Math.min(cntr.offsetWidth - node.offsetWidth, x);
    x = Math.max(x, 0);
    Monocle.Styles.setX(node, x);
  }


  function createControlElements(holder) {
    var cntr = holder.dom.make('div', k.CLS.container);
    var track = cntr.dom.append('div', k.CLS.track);
    var needleTrail = cntr.dom.append('div', k.CLS.trail);
    var needle = cntr.dom.append('div', k.CLS.needle);
    var bubble = cntr.dom.append('div', k.CLS.bubble);

    var cntrListeners, bodyListeners;

    var moveEvt = function (evt, x) {
      evt.preventDefault();
      x = (typeof x == "number") ? x : evt.m.registrantX;
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
      Monocle.Events.deafenForContact(cntr, cntrListeners);
      Monocle.Events.deafenForContact(document.body, bodyListeners);
      bubble.style.display = "none";
    }

    var startFn = function (evt) {
      evt.stopPropagation();
      bubble.style.display = "block";
      moveEvt(evt);
      cntrListeners = Monocle.Events.listenForContact(
        cntr,
        { move: moveEvt }
      );
      bodyListeners = Monocle.Events.listenForContact(
        document.body,
        { end: endEvt }
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
