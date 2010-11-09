Monocle.Flippers.Legacy = function (reader) {

  var API = { constructor: Monocle.Flippers.Legacy }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    pageCount: 1,
    divs: {}
  }


  function initialize() {
    p.reader = reader;
  }


  function addPage(pageDiv) {
    pageDiv.m.dimensions = new Monocle.Dimensions.Vert(pageDiv);
  }


  function getPlace() {
    return page().m.place;
  }


  function moveTo(locus, callback) {
    var fn = frameToLocus;
    if (typeof callback == "function") {
      fn = function (locus) { frameToLocus(locus); callback(locus); }
    }
    p.reader.getBook().setOrLoadPageAt(page(), locus, fn);
  }


  function listenForInteraction(panelClass) {
    if (typeof panelClass != "function") {
      panelClass = k.DEFAULT_PANELS_CLASS;
      if (!panelClass) {
        console.warn("Invalid panel class.")
      }
    }
    p.panels = new panelClass(API, { 'end': turn });
  }


  function page() {
    return p.reader.dom.find('page');
  }


  function turn(panel) {
    var dir = panel.properties.direction;
    var place = getPlace();
    if (
      (dir < 0 && place.onFirstPageOfBook()) ||
      (dir > 0 && place.onLastPageOfBook())
    ) { return; }
    moveTo({ page: getPlace().pageNumber() + dir });
  }


  function frameToLocus(locus) {
    var cmpt = p.reader.dom.find('component');
    var win = cmpt.contentWindow;
    var srcY = scrollPos(win);
    var dims = page().m.dimensions;
    var pageHeight = dims.properties.pageHeight;
    var destY = dims.locusToOffset(locus);

    //console.log(srcY + " => " + destY);
    if (Math.abs(destY - srcY) > pageHeight) {
      return win.scrollTo(0, destY);
    }

    showIndicator(win, srcY < destY ? srcY + pageHeight : srcY);
    Monocle.defer(
      function () { smoothScroll(win, srcY, destY, 300, scrollingFinished); },
      150
    );
  }


  function scrollPos(win) {
    // Firefox, Chrome, Opera, Safari
    if (win.pageYOffset) {
      return win.pageYOffset;
    }
    // Internet Explorer 6 - standards mode
    if (win.document.documentElement && win.document.documentElement.scrollTop) {
      return win.document.documentElement.scrollTop;
    }
    // Internet Explorer 6, 7 and 8
    if (win.document.body.scrollTop) {
      return win.document.body.scrollTop;
    }
    return 0;
  }


  function smoothScroll(win, currY, finalY, duration, callback) {
    clearTimeout(win.smoothScrollInterval);
    var stamp = (new Date()).getTime();
    var frameRate = 40;
    var step = (finalY - currY) * (frameRate / duration);
    var stepFn = function () {
      var destY = currY + step;
      if (
        (new Date()).getTime() - stamp > duration ||
        Math.abs(currY - finalY) < Math.abs((currY + step) - finalY)
      ) {
        clearTimeout(win.smoothScrollInterval);
        win.scrollTo(0, finalY);
        if (callback) { callback(); }
      } else {
        win.scrollTo(0, destY);
        currY = destY;
      }
    }
    win.smoothScrollInterval = setInterval(stepFn, frameRate);
  }


  function scrollingFinished() {
    hideIndicator(page().m.activeFrame.contentWindow);
    p.reader.dispatchEvent('monocle:turn');
  }


  function showIndicator(win, pos) {
    if (p.hideTO) { clearTimeout(p.hideTO); }

    var doc = win.document;
    if (!doc.body.indicator) {
      doc.body.indicator = createIndicator(doc);
      doc.body.appendChild(doc.body.indicator);
    }
    doc.body.indicator.line.style.display = "block";
    doc.body.indicator.style.opacity = 1;
    positionIndicator(pos);
  }


  function hideIndicator(win) {
    var doc = win.document;
    p.hideTO = Monocle.defer(
      function () {
        if (!doc.body.indicator) {
          doc.body.indicator = createIndicator(doc);
          doc.body.appendChild(doc.body.indicator);
        }
        var dims = page().m.dimensions;
        positionIndicator(
          dims.locusToOffset(getPlace().getLocus()) + dims.properties.pageHeight
        )
        doc.body.indicator.line.style.display = "none";
        doc.body.indicator.style.opacity = 0.5;
      },
      600
    );
  }


  function createIndicator(doc) {
    var iBox = doc.createElement('div');
    doc.body.appendChild(iBox);
    Monocle.Styles.applyRules(iBox, k.STYLES.iBox);

    iBox.arrow = doc.createElement('div');
    iBox.appendChild(iBox.arrow);
    Monocle.Styles.applyRules(iBox.arrow, k.STYLES.arrow);

    iBox.line = doc.createElement('div');
    iBox.appendChild(iBox.line);
    Monocle.Styles.applyRules(iBox.line, k.STYLES.line);

    return iBox;
  }


  function positionIndicator(y) {
    var p = page();
    var doc = p.m.activeFrame.contentDocument;
    var maxHeight = p.m.dimensions.properties.bodyHeight;
    maxHeight -= doc.body.indicator.offsetHeight;
    if (y > maxHeight) {
      y = maxHeight;
    }
    doc.body.indicator.style.top = y + "px";
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;

  initialize();

  return API;
}

Monocle.Flippers.Legacy.FORWARDS = 1;
Monocle.Flippers.Legacy.BACKWARDS = -1;
Monocle.Flippers.Legacy.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;

Monocle.Flippers.Legacy.STYLES = {
  iBox: {
    'position': 'absolute',
    'right': 0,
    'left': 0,
    'height': '10px'
  },
  arrow: {
    'position': 'absolute',
    'right': 0,
    'height': '10px',
    'width': '10px',
    'background': '#333',
    'border-radius': '6px'
  },
  line: {
    'width': '100%',
    'border-top': '2px dotted #333',
    'margin-top': '5px'
  }
}

Monocle.pieceLoaded('flippers/legacy');
