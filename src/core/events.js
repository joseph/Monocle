Monocle.Events = {};


Monocle.Events.wrapper = function (fn) {
  return function (evt) { evt.m = new Gala.Cursor(evt); fn(evt); }
}


Monocle.Events.listen = Gala.listen;


Monocle.Events.deafen =  Gala.deafen;


Monocle.Events.dispatch = Gala.dispatch;


Monocle.Events.listenForTap = function (elem, fn, tapClass) {
  return Gala.onTap(elem, Monocle.Events.wrapper(fn), tapClass);
}


Monocle.Events.deafenForTap = Gala.deafenGroup;


Monocle.Events.listenForContact = function (elem, fns, options) {
  options = options || { useCapture: false };
  var wrappers = {};
  for (var evtType in fns) {
    wrappers[evtType] = Monocle.Events.wrapper(fns[evtType]);
  }
  return Gala.onContact(elem, wrappers, options.useCapture);
}


Monocle.Events.deafenForContact = Gala.deafenGroup;


// Listen for the next transition-end event on the given element, call
// the function, then deafen.
//
// Returns a function that can be used to cancel the listen early.
//
Monocle.Events.afterTransition = function (elem, fn) {
  var evtName = "transitionend";
  if (Monocle.Browser.is.WebKit) {
    evtName = 'webkitTransitionEnd';
  } else if (Monocle.Browser.is.Opera) {
    evtName =  'oTransitionEnd';
  }
  var l = null, cancel = null;
  l = function () { fn(); cancel(); }
  cancel = function () { Monocle.Events.deafen(elem, evtName, l); }
  Monocle.Events.listen(elem, evtName, l);
  return cancel;
}
