Carlyle.Flippers.Legacy = function (reader, setPageFn) {
  if (Carlyle.Flippers == this) {
    return new Carlyle.Flippers.Legacy(reader, setPageFn);
  }

  // Constants
  var k = {
    LEGACY_MESSAGE: "Your browser doesn't support Monocle's full feature set. " +
      'You could try <a href="http://mozilla.com/firefox">Firefox</a>, ' +
      'Apple\'s <a href="http://apple.com/safari">Safari</a> or ' +
      'Google\'s <a href="http://google.com/chrome">Chrome</a>.',
    NEXT_BUTTON_TEXT: "Next part..."
  }

  // Properties
  var p = {
    pageCount: 1,
    divs: {}
  }

  var API = {
    constructor: Carlyle.Flippers.Legacy,
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
    // FIXME: callback should hide nextbutton if on last component.
    var rslt = p.setPageFn(p.page, locus);
    p.reader.dispatchEvent('carlyle:turn');
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
      p.divs.legacyMessage.style.cssText = Carlyle.Styles.ruleText(
        Carlyle.Styles.Flippers.Legacy.message
      );
      p.page.scrollerDiv.insertBefore(p.divs.legacyMessage, p.page.contentDiv);
    }

    if (!p.divs.nextButton) {
      p.divs.nextButton = document.createElement('div');
      p.divs.nextButton.innerHTML = k.NEXT_BUTTON_TEXT;
      p.divs.nextButton.style.cssText = Carlyle.Styles.ruleText(
        Carlyle.Styles.Flippers.Legacy.next
      );
      p.divs.nextButton.onclick = function () {
        moveTo({ percent: 1.5 });
      }
      p.page.scrollerDiv.appendChild(p.divs.nextButton);
    }
  }


  function listenForInteraction() {
    // TODO
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


Carlyle.Styles.Flippers.Legacy = {
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
  next: {
    "background": "#F0F"
  }
}
