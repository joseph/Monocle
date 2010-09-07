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
  var span = document.createElement('span');
  span.innerHTML = "["+cls+"] " + evt.type;
  span.className = cls + "Evt";
  out.inner.appendChild(span);
  evt.preventDefault();
}


function registerElem(elem, klass) {
  elem.addEventListener('touchstart', touchEvt, false);
  elem.addEventListener('touchmove', touchEvt, false);
  elem.addEventListener('touchend', touchEvt, false);
  elem.addEventListener('touchcancel', touchEvt, false);
  elem.addEventListener('mousedown', touchEvt, false);
  elem.addEventListener('mouseup', touchEvt, false);
  elem.addEventListener('click', touchEvt, false);
  elem.evtClass = klass;
  return elem;
}


function evtSection() {
  window.newEvtSection = true;
  console.log('new evt section');
}
