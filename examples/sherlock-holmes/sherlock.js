(function () {

  var bookData = {
    getComponents: function () {
      return [
        "content/epubfile-0002.xml",
        "content/epubfile-0003.xml",
        "content/epubfile-0010.xml",
        "content/epubfile-0012.xml",
        "content/epubfile-0016.xml",
        "content/epubfile-0019.xml",
        "content/epubfile-0022.xml",
        "content/epubfile-0024.xml",
        "content/epubfile-0027.xml",
        "content/epubfile-0029.xml",
        "content/epubfile-0032.xml",
        "content/epubfile-0034.xml",
        "content/epubfile-0037.xml",
        "content/epubfile-0039.xml",
        "content/epubfile-0042.xml",
        "content/epubfile-0043.xml",
        "content/epubfile-0045.xml",
      ];
    },

    getContents: function () {
      return [
        {
          title: "A Scandal In Bohemia",
          src: "content/epubfile-0012.xml"
        },
        {
          title: "The Red-Headed League",
          src: "content/epubfile-0016.xml"
        },
        {
          title: "A Case Of Identity",
          src: "content/epubfile-0019.xml"
        },
        {
          title: "The Boscombe Valley Mystery",
          src: "content/epubfile-0022.xml"
        },
        {
          title: "The Five Orange Pips",
          src: "content/epubfile-0024.xml"
        },
        {
          title: "The Man With The Twisted Lip",
          src: "content/epubfile-0027.xml"
        },
        {
          title: "The Adventure Of The Speckled Band",
          src: "content/epubfile-0032.xml"
        },
        {
          title: "The Adventure Of The Engineer&#39;s Thumb",
          src: "content/epubfile-0034.xml"
        },
        {
          title: "The Adventure Of The Copper Beeches",
          src: "content/epubfile-0042.xml"
        }
      ];
    },

    getComponent: function (componentId) {
      return this.getViaAjax('../'+componentId);
    },

    getMetaData: function(key) {
      return {
        title: "The Adventures of Sherlock Holmes",
        creator: "Arthur Conan Doyle"
      }[key];
    },

    getViaAjax: function (path) {
      var ajReq = new XMLHttpRequest();
      ajReq.open("GET", path, false);
      ajReq.send(null);
      return ajReq.responseText;
    }
  }


  // Dumps the current component-id and page number to cookie.
  // Note: you might want to scope this per book.
  //
  function savePositionToCookie() {
    var place = reader.getPlace();
    document.cookie = "component="+encodeURIComponent(place.component().id);
    document.cookie = "percent="+place.percentageThrough();
  }


  // Check the cookie for a previous location and go to it.
  function restorePositionFromCookie() {
    if (!document.cookie) {
      return;
    }
    var lastCmpt = document.cookie.match(/component=(.+?)(;|$)/);
    var lastPercent = document.cookie.match(/percent=(.+?)(;|$)/);
    if (lastCmpt && lastCmpt[1] && lastPercent && lastPercent[1]) {
      lastPercent = parseFloat(lastPercent[1]);
      lastCmpt = decodeURIComponent(lastCmpt[1]);
      console.log("Moving to "+lastPercent+"% of "+lastCmpt);
      reader.moveToPercentageThrough(lastPercent, lastCmpt);
    }
  }


  function createTocDropdown() {
    var chaps = window.reader.getBook().contents;
    var ul = document.createElement('ul');
    ul.className = "tocSelect";
    var subLi = document.createElement('li');
    var subUl = document.createElement('ul');
    subLi.innerHTML = "Choose a chapter"
    for (var i = 0; i < chaps.length; ++i) {
      var chap = chaps[i];
      var li = document.createElement('li');
      li.innerHTML = chap.title;
      li.component = chap.component;
      li.fragment = chap.fragment;
      subUl.appendChild(li);
    }
    subLi.appendChild(subUl);
    ul.appendChild(subLi);
    document.body.appendChild(ul);
    ul.onclick = function (evt) {
      li = evt.srcElement;
      reader.goToChapter(li.fragment, li.component);
    }
  }


  function createScrubber() {
    var scrubberDiv = document.createElement('div');
    var scrubberRange = document.createElement('input');
    scrubberRange.type = "range";
    scrubberRange.setAttribute('min', 1);
    var scrubberInfo = document.createElement('span');
    scrubberDiv.appendChild(scrubberRange);
    scrubberDiv.appendChild(scrubberInfo);
    document.body.appendChild(scrubberDiv);

    var updateScrubber = function () {
      var place = reader.getPlace();
      var lpn = place.component().lastPageNumber();
      if (lpn == 1) {
        scrubberDiv.style.display = "none";
      } else {
        scrubberDiv.style.display = "block";
      }
      scrubberRange.setAttribute('max', lpn);
      scrubberRange.value = place.pageNumber();
      if (place.chapterTitle()) {
        scrubberInfo.innerHTML = place.chapterTitle() + " &#8212; ";
      } else {
        scrubberInfo.innerHTML = "";
      }
      scrubberInfo.innerHTML += place.pageNumber() + "/" + lpn;
    }

    updateScrubber();
    var box = document.getElementById('bookBox');
    box.addEventListener('carlyle:turn', updateScrubber);

    scrubberRange.addEventListener(
      'change',
      function () {
        reader.moveToPage(parseInt(scrubberRange.value));
      }
    );
  }


  // Initialize the reader element and set up event listeners.
  //
  function init() {
    var box = document.getElementById('bookBox');
    window.reader = Carlyle.Reader(box, bookData);
    restorePositionFromCookie();
    box.addEventListener('carlyle:turn', savePositionToCookie, false);
    createScrubber();
    //createTocDropdown();
  }

  window.addEventListener('load', init, false);
})();
