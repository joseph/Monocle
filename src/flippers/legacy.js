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


  function page() {
    return p.reader.dom.find('page');
  }


  function getPlace() {
    return page().m.place;
  }


  function moveTo(locus) {
    p.reader.getBook().setOrLoadPageAt(page(), locus, function () {});
    p.reader.dispatchEvent('monocle:turn');
  }


  function listenForInteraction(panelClass) {
    if (typeof panelClass != "function") {
      panelClass = k.DEFAULT_PANELS_CLASS;
      if (!panelClass) {
        console.warn("Invalid panel class.")
      }
    }
    p.panels = new panelClass(
      API,
      {
        'end': function (panel, x) { turn(panel.properties.direction); }
      }
    );
  }


  function turn(dir) {
    var cmpt = p.reader.dom.find('component');
    var startY = scrollPos(cmpt.contentWindow);
    showIndicator(
      cmpt.contentWindow,
      dir > 0 ? startY + k.TMP : startY
    );
    Monocle.defer(
      function () {
        smoothScroll(
          cmpt.contentWindow,
          startY,
          startY + k.TMP * dir,
          300,
          hideIndicator
        );
      },
      150
    );
  }


  function scrollPos(win) {
    // Firefox, Chrome, Opera, Safari
    if (win.pageYOffset) return win.pageYOffset;
    // Internet Explorer 6 - standards mode
    if (win.document.documentElement && win.document.documentElement.scrollTop)
        return win.document.documentElement.scrollTop;
    // Internet Explorer 6, 7 and 8
    if (win.document.body.scrollTop) return win.document.body.scrollTop;
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
        if (callback) { callback(win); }
      } else {
        win.scrollTo(0, destY);
        currY = destY;
      }
    }
    win.smoothScrollInterval = setInterval(stepFn, frameRate);
  }


  function showIndicator(win, pos) {
    if (p.hideTO) { clearTimeout(p.hideTO); }

    if (!win.indicator) {
      var doc = win.document;
      win.indicator = doc.createElement('div');
      Monocle.Styles.applyRules(win.indicator, {
        position: 'absolute',
        right: 0,
        'border-top': '2px dashed #F00'
      });
      doc.body.appendChild(win.indicator);
    }
    win.indicator.style.top = pos+"px";
    win.indicator.style.width = '100%';
  }


  function hideIndicator(win) {
    p.hideTO = Monocle.defer(
      function () {
        win.indicator.style.top = (win.indicator.offsetTop + k.TMP) + "px";
        win.indicator.style.width = "10px";
      },
      600
    );
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

Monocle.Flippers.Legacy.TMP = 350;
Monocle.Flippers.Legacy.FORWARDS = 1;
Monocle.Flippers.Legacy.BACKWARDS = -1;
Monocle.Flippers.Legacy.DEFAULT_PANELS_CLASS = Monocle.Panels.TwoPane;
Monocle.Flippers.Legacy.LEGACY_MESSAGE =
  "Your browser doesn't support Monocle's full feature set. " +
  'You could try <a href="http://mozilla.com/firefox">Firefox</a>, ' +
  'Apple\'s <a href="http://apple.com/safari">Safari</a> or ' +
  'Google\'s <a href="http://google.com/chrome">Chrome</a>.';

Monocle.pieceLoaded('flippers/legacy');
