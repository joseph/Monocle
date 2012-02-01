(function () {

  var pos = 0;
  var parts = {};


  function init() {
    parts.mode = document.getElementById('mode');
    parts.frame = document.getElementById('frame');
    parts.imp1 = document.getElementById('imp1');
    parts.imp2 = document.getElementById('imp2');
    parts.imp3 = document.getElementById('imp3');
    parts.imp4 = document.getElementById('imp4');

    parts.imp1.addEventListener('click', reverseJump, false);
    parts.imp2.addEventListener('click', jump, false);
    impBPs(0,1,2,3);
  }


  function jump() {
    parts.mode.className = 'forwardTurn';
    parts.frame.className = 'pageTurn';
    setTimeout(nextPage, 620);
  }


  function reverseJump() {
    parts.mode.className = 'reverseTurn';
    pos -= 340;
    impBPs(0,2,1,3);
    setTimeout(function () {
      parts.frame.className = 'pageTurn';
      setTimeout(prevPage, 620);
    }, 50);
  }


  function nextPage() {
    parts.frame.className = '';
    pos += 340;
    impBPs(0,1,2,3);
  }


  function prevPage() {
    parts.mode.className = 'forwardTurn';
    parts.frame.className = '';
    impBPs(0,1,2,3);
  }


  function impBPs(a,b,c,d) {
    setBP(parts.imp1, a)
    setBP(parts.imp2, b)
    setBP(parts.imp3, c)
    setBP(parts.imp4, d)
  }


  function setBP(elem, n) {
    var x = n*160+pos;
    if (n >= 2) { x += 20; }
    x = 0 - x;
    elem.style.backgroundPosition = x+"px 0px";
  }


  window.addEventListener('load', init, false);

})();
