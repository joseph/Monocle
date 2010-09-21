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


  function page() {
    return p.reader.dom.find('page');
  }


  function getPlace() {
    return page().m.place;
  }


  function moveTo(locus) {
    p.reader.getBook().setOrLoadPageAt(page(), locus, updateButtons);
    p.reader.dispatchEvent('monocle:turn');
  }


  function overrideDimensions() {
    var sheaf = p.reader.dom.find('sheaf');
    var cmpt = p.reader.dom.find('component');

    // FIXME
    sheaf.style.right = "0";
    sheaf.style.overflow = "auto";
    cmpt.style.position = "relative";
    cmpt.style.width = "100%";
    cmpt.style.minWidth = "0%";
    Monocle.Styles.affix(cmpt, 'column-width', 'auto');
  }


  function updateButtons() {
    var cIndex = getPlace().properties.component.properties.index;
    var dom = p.reader.dom;
    if (cIndex == 0) {
      dom.find('flipper_legacy_message').style.display = "block";
      dom.find('flipper_legacy_buttonPrev').style.display = "none";
    } else {
      dom.find('flipper_legacy_message').style.display = "none";
      dom.find('flipper_legacy_buttonPrev').style.display = "block";
    }

    if (cIndex == p.reader.getBook().properties.lastCIndex) {
      dom.find('flipper_legacy_buttonNext').style.display = "none";
    } else {
      dom.find('flipper_legacy_buttonNext').style.display = "block";
    }
  }


  function listenForInteraction() {
    var dom = p.reader.dom;
    var sheaf = dom.find('sheaf');
    var cmpt = dom.find('component');

    // Sanctimonious little message about upgrading your browser. Sorry.
    sheaf.insertBefore(
      dom.make('div', 'flipper_legacy_message', { html: k.LEGACY_MESSAGE }),
      cmpt
    );

    // 'previous component' button
    var prevBtn = dom.make(
      'div',
      'flipper_legacy_buttonPrev',
      { 'class': 'flipper_legacy_button', html: k.buttonText.PREV }
    )
    sheaf.insertBefore(prevBtn, cmpt);
    Monocle.Events.listen(
      prevBtn,
      'click',
      function () { moveTo({ direction: -1 }) }
    );

    // 'next component' button
    var nextBtn = sheaf.dom.append(
      'div',
      'flipper_legacy_buttonNext',
      { 'class': 'flipper_legacy_button', html: k.buttonText.NEXT }
    );
    Monocle.Events.listen(
      nextBtn,
      'click',
      function () { moveTo({ direction: 1 }) }
    );
  }


  // THIS IS THE CORE API THAT ALL FLIPPERS MUST PROVIDE.
  API.pageCount = p.pageCount;
  API.getPlace = getPlace;
  API.moveTo = moveTo;
  API.listenForInteraction = listenForInteraction;
  API.overrideDimensions = overrideDimensions;

  initialize();

  return API;
}

Monocle.Flippers.Legacy.LEGACY_MESSAGE =
  "Your browser doesn't support Monocle's full feature set. " +
  'You could try <a href="http://mozilla.com/firefox">Firefox</a>, ' +
  'Apple\'s <a href="http://apple.com/safari">Safari</a> or ' +
  'Google\'s <a href="http://google.com/chrome">Chrome</a>.';
Monocle.Flippers.Legacy.buttonText = {
  PREV: "... Previous part",
  NEXT: "Next part..."
}

Monocle.pieceLoaded('flippers/legacy');
