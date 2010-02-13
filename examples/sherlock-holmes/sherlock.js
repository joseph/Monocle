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
      var lpn = place.properties.component.lastPageNumber();
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
    createScrubber();
  }

  window.addEventListener('load', init, false);
})();
