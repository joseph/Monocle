Monocle.Flippers.Legacy = function (reader, setPageFn) {
  if (Monocle.Flippers == this) {
    return new Monocle.Flippers.Legacy(reader, setPageFn);
  }

  // Constants
  var k = {
    LEGACY_MESSAGE: "Your browser doesn't support Monocle's full feature set. " +
      'You could try <a href="http://mozilla.com/firefox">Firefox</a>, ' +
      'Apple\'s <a href="http://apple.com/safari">Safari</a> or ' +
      'Google\'s <a href="http://google.com/chrome">Chrome</a>.',
    buttonText: {
      PREV: "... Previous part",
      NEXT: "Next part..."
    }
  }

  // Properties
  var p = {
    pageCount: 1,
    divs: {}
  }

  var API = {
    constructor: Monocle.Flippers.Legacy,
    properties: p,
    constants: k
  }


  function initialize() {
    p.reader = reader;
    p.setPageFn = setPageFn;
  }


  function addPage(pageDiv) {
    p.page = pageDiv;
  }


  function visiblePages() {
    return [p.page];
  }


  function getPlace() {
    return p.reader.getBook().placeFor(p.page.contentDiv);
  }


  function moveTo(locus) {
    var rslt = p.setPageFn(p.page, locus, updateButtons);
    p.reader.dispatchEvent('monocle:turn');
    return rslt;
  }



  function overrideDimensions() {
    p.page.scrollerDiv.style.right = "0";
    p.page.scrollerDiv.style.overflow = "auto";
    p.page.contentDiv.style.position = "relative";
    p.page.contentDiv.style.width = "100%";
    p.page.contentDiv.style.minWidth = "0%";

    if (!p.divs.legacyMessage) {
      p.divs.legacyMessage = document.createElement('div');
      p.divs.legacyMessage.innerHTML = k.LEGACY_MESSAGE;
      p.divs.legacyMessage.style.cssText = Monocle.Styles.ruleText(
        Monocle.Styles.Flippers.Legacy.message
      );
      p.page.scrollerDiv.insertBefore(p.divs.legacyMessage, p.page.contentDiv);
    }

    if (!p.divs.prevButton) {
      p.divs.prevButton = document.createElement('div');
      p.divs.prevButton.innerHTML = k.buttonText.PREV;
      p.divs.prevButton.style.cssText = Monocle.Styles.ruleText(
        Monocle.Styles.Flippers.Legacy.button
      );
      p.page.scrollerDiv.insertBefore(p.divs.prevButton, p.page.contentDiv);
    }

    if (!p.divs.nextButton) {
      p.divs.nextButton = document.createElement('div');
      p.divs.nextButton.innerHTML = k.buttonText.NEXT;
      p.divs.nextButton.style.cssText = Monocle.Styles.ruleText(
        Monocle.Styles.Flippers.Legacy.button
      );
      p.page.scrollerDiv.appendChild(p.divs.nextButton);
    }
  }


  function updateButtons() {
    var cIndex = getPlace().properties.component.properties.index;
    if (cIndex == 0) {
      p.divs.legacyMessage.style.display = "block";
      p.divs.prevButton.style.display = "none";
    } else {
      p.divs.legacyMessage.style.display = "none";
      p.divs.prevButton.style.display = "block";
    }

    if (cIndex == p.reader.getBook().properties.lastCIndex) {
      p.divs.nextButton.style.display = "none";
    } else {
      p.divs.nextButton.style.display = "block";
    }
  }


  function listenForInteraction() {
    Monocle.addListener(
      p.divs.prevButton,
      'click',
      function () { moveTo({ percent: -0.5 }) }
    )
    Monocle.addListener(
      p.divs.nextButton,
      'click',
      function () { moveTo({ percent: 1.5 }) }
    )
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.addPage = addPage;
  API.visiblePages = visiblePages;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;
  API.overrideDimensions = overrideDimensions;

  initialize();

  return API;
}


Monocle.Styles.Flippers.Legacy = {
  message: {
    "border": "1px solid #987",
    "background": "#FFC",
    "color": "#333",
    "font-family": "Helvetica, Arial, sans-serif",
    "font-size": "11px",
    "margin-right": "3px",
    "margin-bottom": "3px",
    "padding": "0.5em 1em"
  },
  button: {
    "background": "#DDD",
    "padding": "6px",
    "border": "1px solid #666",
    "color": "#009",
    "font": "bold 12px Helvetica, Arial, sans-serif",
    "text-shadow": "-1px -1px #EEE",
    "border-radius": "5px",
    "margin-right": "3px",
    "margin-bottom": "3px",
    "margin-top": "3px"
  }
}
