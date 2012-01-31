function jump() {
  document.body.className = 'pageTurn';
  setTimeout(nextPage, 420);
}

function nextPage() {
  document.body.className = '';
  window.pos = (window.pos || 0) + 340;
  setBP(document.getElementById('imp1'), 0)
  setBP(document.getElementById('imp2'), 1)
  setBP(document.getElementById('imp3'), 2)
  setBP(document.getElementById('imp4'), 3)
}

function setBP(elem, n) {
  var x = n*160+window.pos;
  if (n >= 2) { x += 20; }
  elem.style.backgroundPosition = "-"+x+"px 0px";
}
