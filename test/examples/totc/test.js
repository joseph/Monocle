(function () {

  with (Monocle.Styles) {
    container.background = "none";
    container.right = "24px";
    container.left = '0';
    container.width = 'auto';
    page.top = page.bottom = "6px";
    page["-webkit-box-shadow"] = "1px 0 2px #997";
    page["-moz-box-shadow"] = "1px 0 2px #997";
    page["-webkit-border-top-left-radius"] = "26px 4px";
    page["-webkit-border-bottom-left-radius"] = "26px 4px";
    page["-moz-border-radius-topleft"] = "26px 4px";
    page["-moz-border-radius-bottomleft"] = "26px 4px";
    page['background-color'] = "#FFFEFC";
    page['background-image'] =
      "-moz-linear-gradient(0deg, #EDEAE8 0px, #FFFEFC 24px)";
    page.background =
      "-webkit-gradient(linear, 0 0, 24 0, from(#EDEAE8), to(#FFFEFC))";
    sheaf.top = sheaf.bottom = "8%";
    sheaf.left = "6%";
    sheaf.right = "8%";
    body.color = "#310";
    body["font-family"] = "Palatino, Georgia, serif";
    body["line-height"] = "120%";
    Controls.Magnifier.button.color = "#632";
    Controls.Magnifier.button.padding = "2%";
    Controls.Magnifier.button['-webkit-border-radius'] = "3px";
    Controls.Magnifier.button.background = "#FFF";
    Controls.Magnifier.button.top = "1%";
    Controls.Magnifier.button.right = "6%";
    Controls.Contents.container.background = "#E0D3C0";
    Controls.Contents.container.border = "1px solid #EEd";
    Controls.Contents.list.font = "11pt Georgia, serif";
    Controls.Contents.list.color = "#642";
    Controls.Contents.list['text-shadow'] = "1px 1px #FFF6E0";
    Controls.Contents.chapter['border-bottom'] = "2px groove #FFF6E9";
  }

  var bookData = {
    getComponents: function () {
      var componentDiv = document.getElementById('components');
      var cmpts = [];
      for (var i = 0; i < componentDiv.childNodes.length; ++i) {
        var node = componentDiv.childNodes[i];
        if (node.nodeType == 1 && node.id) {
          cmpts.push(node.id);
        }
      }
      return cmpts;
    },
    getContents: function () {
      return [
        {
          title: "Book the First&mdash;Recalled to Life",
          src: "part1",
          children: [
            {
              title: "I. The Period",
              src: "part1#part1-I"
            },
            {
              title: "II. The Mail",
              src: "part1#part1-II"
            },
            {
              title: "III. The Night Shadows",
              src: "part1-III"
            },
            {
              title: "IV. The Preparation",
              src: "part1-IV"
            },
            {
              title: "V. The Wine-shop",
              src: "part1-V"
            },
            {
              title: "V. The Shoemaker",
              src: "part1-VI"
            }
          ]
        },
        {
          title: "Book the Second&mdash;the Golden Thread",
          src: "part2",
          children: [
            {
              title: "I. Five Years Later",
              src: "part2#part2-I"
            },
            {
              title: "II. A Sight",
              src: "part2-II"
            },
            {
              title: "III. A Disappointment",
              src: "part2-III"
            },
            {
              title: "IV. Congratulatory",
              src: "part2-IV"
            }
          ]
        }
      ]
    },
    getComponent: function (componentId) {
      return document.getElementById(componentId).innerHTML;
    },
    getMetaData: function (key) {
      return {
        title: "A Tale of Two Cities",
        creator: "Charles Dickens"
      }[key];
    }
  }


  function createToC(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    var controlLayer = document.getElementById('readerCntr');

    tocList = document.createElement('ul');
    tocList.className = 'root';
    var listBuilder = function (chp, padLvl) {
      var li = document.createElement('li');
      var span = document.createElement('span');
      span.style.paddingLeft = padLvl + "em";
      li.appendChild(span);
      span.innerHTML = chp.title;
      li.onclick = function () {
        window.reader.skipToChapter(chp.src);
        controlLayer.removeChild(controlLayer.tocMenu);
      }
      tocList.appendChild(li);
      if (chp.children) {
        for (var i = 0; i < chp.children.length; ++i) {
          listBuilder(chp.children[i], padLvl + 1);
        }
      }
    }

    var contents = bookData.getContents();
    for (var i = 0; i < contents.length; ++i) {
      listBuilder(contents[i], 0);
    }

    if (!controlLayer.tocMenu) {
      controlLayer.tocMenu = document.createElement('div');
      controlLayer.tocMenu.id = "toc";
      controlLayer.tocMenu.appendChild(tocList);
      var arrow = document.createElement('div');
      arrow.className = "tocArrow";
      controlLayer.tocMenu.appendChild(arrow);
    }
    if (controlLayer.tocMenu.parentNode) {
      controlLayer.removeChild(controlLayer.tocMenu);
    } else {
      controlLayer.appendChild(controlLayer.tocMenu);
    }
  }


  // Initialize the reader element.
  Monocle.addListener(
    window,
    'load',
    function () {
      /* Initialize the reader */
      window.reader = Monocle.Reader('reader', bookData);

      /* Because the 'reader' element changes size on window resize,
       * we should notify it of this event. */
      Monocle.addListener(
        window,
        'resize',
        function () { window.reader.resized() }
      );


      /* SPINNER */
      var spinner = Monocle.Controls.Spinner(window.reader);
      window.reader.addControl(spinner, 'page', { hidden: true });
      spinner.listenForUsualDelays();


      /* PLACE SAVER */
      var placeSaver = new Monocle.Controls.PlaceSaver(reader);
      reader.addControl(placeSaver, 'invisible');
      var lastPlace = placeSaver.savedPlace();
      if (lastPlace) {
        placeSaver.restorePlace();
      }


      /* MAGNIFIER CONTROL */
      var magnifier = new Monocle.Controls.Magnifier(reader);
      reader.addControl(magnifier, 'page');


      /* BOOK TITLE RUNNING HEAD */
      var bookTitle = {}
      bookTitle.contentsMenu = Monocle.Controls.Contents(reader);
      reader.addControl(bookTitle.contentsMenu, 'popover', { hidden: true });
      bookTitle.createControlElements = function () {
        var cntr = document.createElement('div');
        cntr.className = "bookTitle";
        var runner = document.createElement('div');
        runner.className = "runner";
        runner.innerHTML = reader.getBook().getMetaData('title');
        cntr.appendChild(runner);

        Monocle.addListener(
          cntr,
          typeof Touch == "object" ? "touchstart" : "mousedown",
          function (evt) {
            if (evt.preventDefault) {
              evt.stopPropagation();
              evt.preventDefault();
            } else {
              evt.returnValue = false;
            }
            reader.showControl(bookTitle.contentsMenu);
          }
        );

        //Monocle.addListener(cntr, evtType, createToC, false);
        return cntr;
      }
      reader.addControl(bookTitle, 'page');


      /* CHAPTER TITLE RUNNING HEAD */
      var chapterTitle = {
        runners: [],
        createControlElements: function (page) {
          var cntr = document.createElement('div');
          cntr.className = "chapterTitle";
          var runner = document.createElement('div');
          runner.className = "runner";
          cntr.appendChild(runner);
          this.runners.push(runner);
          this.update(page);
          return cntr;
        },
        update: function (page) {
          var place = reader.getPlace(page);
          if (place) {
            this.runners[page.pageIndex].innerHTML = place.chapterTitle();
          }
        }
      }
      reader.addControl(chapterTitle, 'page');
      reader.addListener(
        'monocle:pagechange',
        function (evt) { chapterTitle.update(evt.monocleData.page); }
      );


      /* PAGE NUMBER RUNNING HEAD */
      var pageNumber = {
        runners: [],
        createControlElements: function (page) {
          var cntr = document.createElement('div');
          cntr.className = "pageNumber";
          var runner = document.createElement('div');
          runner.className = "runner";
          cntr.appendChild(runner);
          this.runners.push(runner);
          this.update(page);
          return cntr;
        },
        update: function (page, pageNumber) {
          if (pageNumber) {
            this.runners[page.pageIndex].innerHTML = pageNumber;
          }
        }
      }
      reader.addControl(pageNumber, 'page');
      reader.addListener(
        'monocle:pagechange',
        function (evt) {
          pageNumber.update(evt.monocleData.page, evt.monocleData.pageNumber);
        }
      );


      /* Scrubber */
      var scrubber = new Monocle.Controls.Scrubber(reader);
      reader.addControl(scrubber, 'page', { hidden: true });
      var showFn = function (evt) {
        evt.stopPropagation();
        reader.showControl(scrubber);
        scrubber.updateNeedles();
      }
      var eType = (typeof(Touch) == "object" ? "touchstart" : "mousedown");
      for (var i = 0; i < chapterTitle.runners.length; ++i) {
        Monocle.addListener(chapterTitle.runners[i].parentNode, eType, showFn);
        Monocle.addListener(pageNumber.runners[i].parentNode, eType, showFn);
      }
      var hideScrubber = function (evt) {
        evt.stopPropagation();
        reader.hideControl(scrubber);
      }
      reader.addListener('monocle:contact:start', hideScrubber);
    }
  );
})();
