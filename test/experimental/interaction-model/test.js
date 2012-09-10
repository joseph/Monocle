(function () {

  var parts = {}

  var contacts = [];

  var action = {};

  var LEEWAY = 3;

  function init() {
    parts.reader = document.getElementById('reader');
    parts.cmpts = [
      document.getElementById('cmpt1'),
      document.getElementById('cmpt2')
    ];
    parts.status = document.getElementById('status');
    Monocle.Browser.survey(initListeners);
  }


  function initListeners() {
    Monocle.Events.listenForContact(
      parts.reader,
      { 'start': translatorFunction(parts.reader, readerContactStart) }
    );
    Monocle.Events.listenForContact(
      parts.cmpts[0].contentDocument.defaultView,
      { 'start': translatorFunction(parts.cmpts[0], cmptContactStart) }
    );
    Monocle.Events.listenForContact(
      parts.cmpts[1].contentDocument.defaultView,
      { 'start': translatorFunction(parts.cmpts[1], cmptContactStart) }
    );
  }


  function listenForMoveAndEnd(fnMove, fnEnd) {
    listenOnElem(
      document.defaultView,
      translatorFunction(document.documentElement, fnMove),
      translatorFunction(document.documentElement, fnEnd)
    );
    for (var i = 0, ii = parts.cmpts.length; i < ii; ++i) {
      listenOnElem(
        parts.cmpts[i].contentDocument.defaultView,
        translatorFunction(parts.cmpts[i], fnMove),
        translatorFunction(parts.cmpts[i], fnEnd)
      );
    }
  }


  function listenOnElem(elem, fnMove, fnEnd) {
    var contactListeners = Monocle.Events.listenForContact(
      elem,
      {
        'move': fnMove,
        'end': function (evt) { deafenContactListeners(); fnEnd(evt); }
      }
    );
    contacts.push([elem, contactListeners]);
  }


  function deafenContactListeners() {
    for (var i = 0, ii = contacts.length; i < ii; ++i) {
      Monocle.Events.deafenForContact(contacts[i][0], contacts[i][1]);
    }
    contacts = [];
  }


  function readerContactStart(evt) {
    listenForMoveAndEnd(readerContactMove, readerContactEnd);
    action.startX = evt.m.readerX;
    action.startY = evt.m.readerY;
    action.screenX = evt.m.screenX;
    action.screenY = evt.m.screenY;
    statusUpdate('Lifted from '+action.startX);
  }


  function readerContactMove(evt) {
    statusUpdate('Swiping from '+action.startX+' .. '+evt.m.readerX);
    // Can't prevent mousemove, so has no effect there. Preventing default
    // for touchmove will override scrolling, while still allowing selection.
    evt.preventDefault();
  }


  function readerContactEnd(evt) {
    action.endX = evt.m.readerX;
    if (action.startX > halfway()) {
      if (action.endX < action.startX + LEEWAY) {
        statusUpdate('Released: turned forward');
      } else {
        statusUpdate('Cancelled: swiped left from left');
      }
    } else {
      if (action.endX > action.startX - LEEWAY) {
        statusUpdate('Released: turned backward');
      } else {
        statusUpdate('Cancelled: swiped right from right');
      }
    }
    action = {};
  }


  function cmptContactStart(evt) {
    if (actionIsCancelled(evt)) { return resetAction(); }
    action.startX = evt.m.readerX;
    action.startY = evt.m.readerY;
    action.screenX = evt.m.screenX;
    action.screenY = evt.m.screenY;
    listenForMoveAndEnd(cmptContactMove, cmptContactEnd);
    statusUpdate('Contact on content at '+action.startX);
  }


  function cmptContactMove(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }
    statusUpdate('Contact on content at '+action.startX+' .. '+evt.m.readerX);

    // Can't prevent mousemove, so has no effect there. Preventing default
    // for touchmove will override scrolling, while still allowing selection.
    evt.preventDefault();
  }


  function cmptContactEnd(evt) {
    if (actionIsEmpty()) { return; }
    if (actionIsCancelled(evt)) { return resetAction(); }
    action.endX = evt.m.readerX;
    if (Math.abs(action.endX - action.startX) < LEEWAY) {
      if (action.startX > halfway()) {
        statusUpdate('Tap on content: turned forward');
      } else {
        statusUpdate('Tap on content: turned backward');
      }
    } else {
      var dir = action.startX > action.endX ? 'forward' : 'backward';
      statusUpdate('Swipe on content: turned '+dir);
    }
    action = {};
  }


  // Adds two new properties to evt.m:
  // - readerX
  // - readerY
  //
  // Calculated as the offset of the click from the top left of reader element.
  //
  // Then calls the passed function.
  //
  function translatorFunction(registrant, callback) {
    return function (evt) {
      translatingReaderOffset(registrant, evt, callback);
    }
  }


  function translatingReaderOffset(registrant, evt, callback) {
    // The problem is that the Android browser lies. It says that the
    // event's view is always the originating window for the touch, BUT it
    // calculates pageX against whatever window the touch is currently in.
    // It seems there's no way to detect which 'page' the pageX refers to!
    //
    // But, since we know it's not lying for the originating event (the
    // touchstart), we can calculate all subsequent cursor movement relative
    // to this point, using screen coordinates.

    if (typeof action.screenX != 'undefined') {
      evt.m.readerX = action.startX + (evt.m.screenX - action.screenX);
      evt.m.readerY = action.startY + (evt.m.screenY - action.screenY);
      // statusUpdate([
      //   "CONTINUATION CALC: ",
      //   "action.startX: "+action.startX,
      //   "action.screenX: "+action.screenX,
      //   "evt.m.screenX: "+evt.m.screenX,
      //   "differential: "+(evt.m.screenX - action.screenX),
      //   "=> "+evt.m.readerX+","+evt.m.readerY
      // ].join("\n"));
    } else {
      var dr = document.documentElement.getBoundingClientRect();
      var rr = parts.reader.getBoundingClientRect();
      rr = { left: rr.left - dr.left, top: rr.top - dr.top }

      if (evt.view == window) {
        evt.m.readerX = Math.round(evt.m.pageX - rr.left);
        evt.m.readerY = Math.round(evt.m.pageY - rr.top);
        // statusUpdate([
        //   "TOP LEVEL CALC: ",
        //   "rr.left: "+rr.left,
        //   "evt.m.pageX: "+evt.m.pageX,
        //   "=> "+evt.m.readerX
        // ].join("\n"));
      } else {
        var er = registrant.getBoundingClientRect();
        er = { left: er.left - dr.left, top: er.top - dr.top }
        evt.m.readerX = Math.round((er.left - rr.left) + evt.m.clientX);
        evt.m.readerY = Math.round((er.top - rr.top) + evt.m.clientY);
        // statusUpdate([
        //   "CONTENT-LEVEL CALC: ",
        //   "er.left: "+er.left,
        //   "rr.left: "+rr.left,
        //   "evt.m.clientX: "+evt.m.clientX,
        //   "=> "+evt.m.readerX
        // ].join("\n"));
      }
    }

    callback(evt);
  }


  function halfway() {
    return parts.reader.offsetWidth / 2;
  }


  function statusUpdate(msg) {
    parts.status.innerHTML = msg;
  }


  function resetAction() {
    action = {};
    deafenContactListeners();
    statusUpdate('Cancelled.');
  }


  function actionIsCancelled(evt) {
    var win = evt.target.ownerDocument.defaultView;
    return (evt.defaultPrevented || !win.getSelection().isCollapsed);
  }


  function actionIsEmpty() {
    return typeof action.startX == 'undefined';
  }


  window.addEventListener('load', init, false);

})();
