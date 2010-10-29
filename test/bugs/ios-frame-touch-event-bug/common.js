function touchEvt(evt) {
  var ctgt = evt.currentTarget || evt.currTarget;
  var cls = ctgt.evtClass;
  if (!cls) {
    console.log(ctgt.tagName);
  }
  var out = document.getElementById('out');
  if (!out.inner || window.newEvtSection) {
    out.inner = document.createElement('div');
    out.firstChild ?
      out.insertBefore(out.inner, out.firstChild) :
      out.appendChild(out.inner);
    window.newEvtSection = false;
  }
  var msg = "["+cls+"] " + evt.type;
  if (msg == out.inner.lastMsg) {
    var span = out.inner.lastChild;
    var counter = span.getElementsByTagName('em')[0];
    if (!counter) {
      counter = document.createElement('em');
      counter.innerHTML = "1";
      span.appendChild(counter);
    }
    counter.innerHTML = parseInt(counter.innerHTML) + 1;
  } else {
    var span = document.createElement('span');
    span.innerHTML = msg;
    span.className = cls + "Evt";
    out.inner.appendChild(span);
  }
  out.inner.lastMsg = msg;
  evt.preventDefault();
}


function registerElem(elem, klass) {
  if (isTouch()) {
    elem.addEventListener('touchstart', touchEvt, false);
    elem.addEventListener('touchmove', touchEvt, false);
    elem.addEventListener('touchend', touchEvt, false);
    elem.addEventListener('touchcancel', touchEvt, false);
  } else {
    elem.addEventListener('mousedown', touchEvt, false);
    elem.addEventListener('mouseup', touchEvt, false);
    elem.addEventListener('click', touchEvt, false);
  }
  elem.evtClass = klass;
  return elem;
}


function evtSection() {
  window.newEvtSection = true;
  console.log('new evt section');
}


function isTouch() {
  return ('ontouchstart' in window);
}
