Carlyle.Controls.Scrubber = function (reader) {
  if (Carlyle.Controls == this) {
    return new Carlyle.Controls.Scrubber(reader);
  }

  // Constants.
  var k = {
  }

  // Properties.
  var p = {
  }

  // Public methods and properties.
  var API = {
    constructor: Carlyle.Controls.Scrubber,
    constants: k,
    properties: p
  }


  function initialize() {
    p.reader = reader;
    p.reader.registerPageControl(API);
  }


  function rebaseX(evt, cntr) {
    var cL = 0;
    var box = cntr;
    while (box && typeof(box.offsetLeft) != 'undefined') {
      cL += box.offsetLeft;
      box = box.parentNode;
    }

    var x = evt.pageX;
    if (evt.changedTouches) {
      x = evt.changedTouches[0].pageX;
    }
    return Math.max(Math.min(cntr.offsetWidth, x - cL), 0);
  }


  function getPoint(x, cntr) {
    var pc = (x / cntr.offsetWidth) * 100;
    var cmptIds = reader.getBook().properties.componentIds;
    var cmptWid = 100 / cmptIds.length;
    var cmpt = cmptIds[Math.floor(pc / cmptWid)];
    var cmptPc = ((pc % cmptWid) / cmptWid);
    //console.log("Percentage through: " + cmpt + ", " + cmptPc + "%");
    return { componentId: cmpt, percent: cmptPc }
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


  function createControlElements() {
    var cntr = document.createElement('div');

    cntr.style.cssText = "bottom: 24px; left: 2em; right: 1.5em; height: 12px;" +
      "position: absolute; overflow: hidden; border-top: 4px dotted #930;"

    var display = document.createElement('div');
    cntr.appendChild(display);
    display.style.cssText = "font: 8pt Lucida Grande, Helvetica, sans-serif;" +
      "color: #930";

    var moveEvt = function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var x = rebaseX(evt, cntr);
      var pt = getPoint(x, cntr);
      display.innerHTML = pt.componentId + ": " +
        Math.round(pt.percent * 100) + "%";
      return pt;
    }

    cntr.downEvt = cntr.addEventListener(
      eventType("start"),
      function (evt) {
        moveEvt(evt);
        cntr.addEventListener(eventType('move'), moveEvt, false);
      }
    );

    cntr.upEvt = cntr.addEventListener(
      eventType("end"),
      function (evt) {
        var pt = moveEvt(evt);
        reader.moveToPercentageThrough(pt.percent, pt.componentId);
        cntr.removeEventListener(eventType('move'), moveEvt, false);
        display.innerHTML = "";
      }
    );
    return cntr;
  }


  API.createControlElements = createControlElements;

  initialize();

  return API;
}
