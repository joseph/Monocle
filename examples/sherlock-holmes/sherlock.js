(function () {

  var bookData = {
    getComponents: function () {
      return [
        "content/epubfile-0002.xml",
        //"content/epubfile-0003.xml",
        //"content/epubfile-0010.xml",
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
          component: "content/epubfile-0012.xml"
        },
        {
          title: "The Red-Headed League",
          component: "content/epubfile-0016.xml"
        },
        {
          title: "A Case Of Identity",
          component: "content/epubfile-0019.xml"
        },
        {
          title: "The Boscombe Valley Mystery",
          component: "content/epubfile-0022.xml"
        },
        {
          title: "The Five Orange Pips",
          component: "content/epubfile-0024.xml"
        },
        {
          title: "The Man With The Twisted Lip",
          component: "content/epubfile-0027.xml"
        },
        {
          title: "The Adventure Of The Speckled Band",
          component: "content/epubfile-0032.xml"
        },
        {
          title: "The Adventure Of The Engineer&#39;s Thumb",
          component: "content/epubfile-0034.xml"
        },
        {
          title: "The Adventure Of The Copper Beeches",
          component: "content/epubfile-0042.xml"
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
    var l = reader.getLocation();
    document.cookie = "component="+encodeURIComponent(l.component);
    document.cookie = "page="+l.page;
  }


  // Check the cookie for a previous location and go to it.
  function restorePositionFromCookie() {
    if (!document.cookie) {
      return;
    }
    var lastComp = document.cookie.match(/component=(.+?)(;|$)/);
    var lastPage = document.cookie.match(/page=(\d+?)(;|$)/);
    if (lastComp && lastComp[1] && lastPage && lastPage[1]) {
      lastPage = parseInt(lastPage[1]);
      lastComp = decodeURIComponent(lastComp[1]);
      console.log("Going to page "+lastPage+" of "+lastComp);
      reader.goToPage(lastPage, lastComp);
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
      var loc = reader.getLocation();
      if (loc.lastPage == 1) {
        scrubberDiv.style.display = "none";
      } else {
        scrubberDiv.style.display = "block";
      }
      scrubberRange.setAttribute('max', loc.lastPage);
      scrubberRange.value = loc.page;
      if (loc.chapter) {
        scrubberInfo.innerHTML = loc.chapter + " &#8212; ";
      } else {
        scrubberInfo.innerHTML = "";
      }
      scrubberInfo.innerHTML += loc.page + "/" + loc.lastPage;
    }

    updateScrubber();
    var box = document.getElementById('bookBox');
    box.addEventListener('carlyle:turn', updateScrubber);

    scrubberRange.addEventListener(
      'change',
      function () {
        reader.goToPage(parseInt(scrubberRange.value));
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
    createTocDropdown();
  }

  window.addEventListener('load', init, false);
})();
