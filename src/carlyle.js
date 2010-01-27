Carlyle = {};



/* BOOK */
Carlyle.Book = function (bookData) {
  if (Carlyle == this) { return new Carlyle.Book(bookData); }

  var dataSource = bookData;
  var components = dataSource.getComponents();
  var contents = dataSource.getContents();
  var componentData = [];

  // componentData:
  //  - componentIndex
  //  - elements
  //      [view_index] []
  //  - lastPageNumber
  //  - parentDimensions
  //      {
  //        width,
  //        height
  //      }
  //  - chunks []
  //      {
  //        firstElementIndex,
  //        lastElementIndex,
  //        firstPageNumber,
  //        lastPageNumber
  //      }
  //  - chapters []
  //    - {
  //        id (fragment),
  //        title,
  //        page
  //    }


  // NB: we could also do chunking on the following:
  //
  //  - start of a section
  //  - print media - pagebreak CSS?


  // This method must return the actual page number WITHIN THE COMPONENT that
  // will result from the page being turned to 'pageN'. That is, it constrains
  // and corrects the value of pageN.
  //
  // In this process, it should load a new component if required, any new
  // chunks as required, remove old components or chunks, and whatever other
  // steps are useful to optimise the speed of page turning.
  //
  // The Reader should call this method before turning any pageDiv to a new
  // page number.
  //
  function preparePageFor(contentDiv, pageN, componentId) {

    // The componentId is optional -- if it is not provided (or it is invalid),
    // we default to the currently active component, and if that doesn't exist,
    // we default to the very first component.
    var cIndex = components.indexOf(componentId);
    if (cIndex == -1) {
      if (contentDiv.componentData) {
        cIndex = contentDiv.componentData.componentIndex
      } else {
        cIndex = 0;
      }
    }
    if (
      !contentDiv.componentData ||
      contentDiv.componentData.componentIndex != cIndex
    ) {
      applyComponent(contentDiv, cIndex);
    }

    // If the book is dirty because a resize has occurred, recalculate all
    // pages in the div.
    //
    if (contentDiv.dirty) {
      // Store current location details
      var lpn = contentDiv.lastPageNumber;

      // Recalculate content dimensions & extent & chunks & etc.
      calculatePages(contentDiv);

      // Guess where (approximately) we're up to in the document.
      if (lpn) {
        pageN = Math.floor(contentDiv.lastPageNumber * (pageN / lpn));
        //console.log('Shifting to page ' + pageN);
      } else {
        pageN = 1;
      }

      // All cleaned up!
      contentDiv.dirty = false;
    }

    // Determine whether we need to apply a new component to the div, and
    // adjust the pageN accordingly.
    var cData = contentDiv.componentData;
    var cIndex = cData.componentIndex;
    var lastComponentIndex = components.length - 1;
    if (cIndex == 0 && pageN < 1) {
      // Before first page of book. Disallow.
      return false;
    } else if (cIndex == lastComponentIndex && pageN > cData.lastPageNumber) {
      // After last page of book. Disallow.
      return false;
    } else if (pageN > cData.lastPageNumber) {
      // Moving to next component.
      pageN -= cData.lastPageNumber;
      applyComponent(contentDiv, cIndex + 1);
    } else if (pageN < 1) {
      // Moving to previous component.
      applyComponent(contentDiv, cIndex - 1);
      pageN += contentDiv.componentData.lastPageNumber;
    }

    return pageN;
  }


  function applyComponent(div, componentIndex) {
    // Request the HTML and turn it into elements, if required.
    componentToElements(componentIndex);

    // Assign the component data to the div.
    div.componentData = componentData[componentIndex];

    // Recalculate the statistics on the component inside the div.
    calculatePages(div);
  }


  // Measures the width of all elements in the current component, and creates
  // chunks of elements for every INTERVAL of pages (where INTERVAL may be, eg,
  // 10).
  //
  // Does nothing if parentDimensions are unchanged.
  //
  // Performed when a new component is loaded in, and when the reader area is
  // resized.
  //
  function calculatePages(div) {
    // Figure out the dimensions of the containing (parent) element.
    var newDims = {
      width: div.parentNode.offsetWidth,
      height: div.parentNode.offsetHeight
    }

    // Repopulate div with the entire component.
    // FIXME: Once we have chunking, we should not do this if we do not
    // need to recalculate chunks. Instead, preparePageFor() should naturally
    // apply the correct chunk.
    //
    // So once that is implemented, we'd move this below the recalculation
    // check on parentDimensions.
    removeAllChildrenFrom(div);

    // FIXME: this copy seems a bit haphazard...
    var index = div.pageDiv.pageIndex;
    if (!div.componentData.elements[index]) {
      var elems = div.componentData.elements[index] = [];
      var len = div.componentData.elements[0].length;
      for (var i = 0; i < len; ++i) {
        elems[i] = div.componentData.elements[0][i].cloneNode(true);
      }
    }
    addElementsTo(div, div.componentData.elements[div.pageDiv.pageIndex]);

    // If the dimensions of the parent haven't changed, we have nothing to do.
    var cData = div.componentData;
    if (cData &&
      cData.parentDimensions &&
      cData.parentDimensions.width == newDims.width &&
      cData.parentDimensions.height == newDims.height
    ) {
      div.lastPageNumber = cData.lastPageNumber;
      return;
    } else {
      cData.parentDimensions = newDims;
    }

    // Now we know how wide the component is...
    newDims.scrollWidth = div.parentNode.scrollWidth;

    // If it appears to be 2 pages long, it may just be one page. We check
    // by making the div too small for multiple columns, then check whether
    // the scrollHeight overflows the offsetHeight.
    //
    // It's messy, but until getClientRects support lands, it's all we got.
    //
    // FIXME: split off into separate method?
    //
    if (newDims.scrollWidth == newDims.width * 2) {
      var actualPageCount = 2;
      if (div.firstChild.getClientRects) {
        if (
          div.firstChild.getClientRects()[0].left ==
          div.lastChild.getClientRects()[0].left
        ) {
          actualPageCount = 1;
        }
      } else {
        div.style.minWidth = "100%";
        if (div.scrollHeight <= newDims.height) {
          actualPageCount = 1;
        }
        div.style.minWidth = "200%";
      }

      newDims.scrollWidth = newDims.width * actualPageCount;
    }

    // ...from which we can deduce the number of columns (ie, 'pages').
    cData.lastPageNumber = Math.ceil(newDims.scrollWidth / newDims.width);
    div.lastPageNumber = cData.lastPageNumber;

    // Calculating chapters -- FIXME: this could really get a lot neater and
    // simpler. What is the actual data we want to store?
    //
    // FIXME: split off into separate method?
    //
    var partsInComponent = [];
    var recurseParts = function (parts) {
      for (var i = parts.length - 1; i >= 0; --i) {
        var part = parts[i];
        if (part.component == cData.componentId) {
          partsInComponent.push(part);
        }

        if (part.children) {
          recurseParts(part.children);
        }
      }
    }
    recurseParts(contents);

    cData.chapters = [];
    for (var i = partsInComponent.length - 1; i >= 0; --i) {
      var part = partsInComponent[i];
      var target = document.getElementById(part.fragment);
      while (target && target.parentNode != div) { target = target.parentNode; }
      if (target) {
        target.scrollIntoView();
        cData.chapters.push({
          id: part.fragment,
          title: part.title,
          page: (div.parentNode.scrollLeft / newDims.width) + 1
        });
      }
    }
    div.parentNode.scrollTop = 0;

    // TODO: calculating chunks
  }


  // Queries the dataSource for innerHTMl of component, and turns it into
  // elements. These are stored in the componentData array against the
  // zeroth view.
  //
  function componentToElements(n) {
    if (componentData[n] && componentData[n].elements) {
      return componentData[n].elements[0];
    }

    if (n >= components.length) {
      // TODO: gone above the number of components defined in the dataSource?
      console.log("TEMPWARN: gone above number of components in dataSource");
      return;
    }

    var html = dataSource.getComponent(components[n]);
    if (html == null || html == "") {
      // TODO: accessed an empty component?
      console.log("TEMPWARN: accessed an empty component");
      return;
    }

    // Okay, create the component data.
    componentData[n] = componentData[n] || {};
    componentData[n].componentIndex = n;
    componentData[n].componentId = components[n];
    componentData[n].elements = [[]];

    // Populate the zeroth view of elements with the elements from a
    // temporary div. Any top-level text node will be inserted into a fresh
    // div parent before being added to the array -- unless it is blank, in
    // which case it is discarded. (In this way we ensure that all items
    // in the array are Elements.)
    //
    var elementArray = componentData[n].elements[0];
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = html;
    while (tmpDiv.hasChildNodes()) {
      var node = tmpDiv.removeChild(tmpDiv.firstChild);
      if (node.nodeType == 1) {
        elementArray.push(node);
      } else if (node.nodeType = 3 && !node.nodeValue.match(/^\s+$/)) {
        var elem = document.createElement('div');
        elem.appendChild(node)
        elementArray.push(elem);
      }
    }
    delete(tmpDiv);

    return componentData[n].elements[0];
  }


  function removeAllChildrenFrom(element) {
    while (element.hasChildNodes()) {
      element.removeChild(element.firstChild);
    }
  }


  function addElementsTo(element, elementArray) {
    var len = elementArray.length;
    for (var i = 0; i < len; ++i) {
      element.appendChild(elementArray[i]);
    }
  }


  var PublicAPI = {
    constructor: Carlyle.Book,
    preparePageFor: preparePageFor,
    getMetaData: dataSource.getMetaData,
    components: components,
    contents: contents
  }

  return PublicAPI;
}


Carlyle.Book.fromHTML = function (html) {
  var bookData = {
    components: ['anonymous'],
    getContents: function () {
      return [];
    },
    getComponent: function (n) {
      return html;
    },
    getMetaData: function (key) {
    }
  }

  return new Carlyle.Book(bookData);
}



/* READER */
Carlyle.Reader = function (node, bookData) {
  if (Carlyle == this) { return new Carlyle.Reader(node, bookData); }

  var FORWARDS = 1, BACKWARDS = -1;

  var boxDiv;
  var containerDiv;
  var spinnerCanvas;
  var pageDivs = [];
  var pageWidth = 0, colWidth = 0;
  var book;
  var turnData = {};
  var resizeTimer = null;

  // Sets up the container and internal elements.
  //
  function initialize(node, bookData) {
    boxDiv = typeof(node) == "string" ? document.getElementById(node) : node;

    var bk;
    if (bookData) {
      bk = new Carlyle.Book(bookData);
    } else {
      bk = Carlyle.Book.fromHTML(boxDiv.innerHTML);
    }
    boxDiv.innerHTML = "";

    // Make sure the boxDiv is absolutely or relatively positioned.
    var currStyle = document.defaultView.getComputedStyle(boxDiv, null);
    var currPosVal = currStyle.getPropertyValue('position');
    if (["absolute", "relative"].indexOf(currPosVal) == -1) {
      boxDiv.style.position = "relative";
    }

    containerDiv = document.createElement('div');
    containerDiv.style.cssText += Carlyle.Styles.ruleText('container');
    boxDiv.appendChild(containerDiv);

    for (var i = 0; i < 2; ++i) {
      pageDivs[i] = document.createElement('div');
      pageDivs[i].pageIndex = i;
      pageDivs[i].style.cssText = Carlyle.Styles.ruleText('page');
      containerDiv.appendChild(pageDivs[i]);

      createRunningHead(pageDivs[i], 'header');
      createRunningHead(pageDivs[i], 'footer');

      pageDivs[i].bodyText = document.createElement('div');
      pageDivs[i].bodyText.style.cssText = Carlyle.Styles.ruleText('bodyText');
      pageDivs[i].appendChild(pageDivs[i].bodyText);

      pageDivs[i].content = document.createElement('div');
      pageDivs[i].content.pageDiv = pageDivs[i];
      pageDivs[i].content.style.cssText = Carlyle.Styles.ruleText('content');
      pageDivs[i].bodyText.appendChild(pageDivs[i].content);
    }
    pageDivs[1].style.cssText += Carlyle.Styles.ruleText('overPage');

    setBook(bk);

    listenForInteraction();
  }


  function setBook(bk) {
    book = bk;
    spin();
    setRunningHead(pageDivs[0].header, { left: bk.getMetaData('title') });
    setRunningHead(pageDivs[1].header, { left: bk.getMetaData('title') });
    calcDimensions();
    spun();
    return book;
  }


  function getBook() {
    return book;
  }


  function resized() {
    spin();
    containerDiv.style.display = "none";
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(
      function () {
        //console.log('Recalculating dimensions after resize.')
        containerDiv.style.display = "block";
        calcDimensions();
        spun();
      },
      100
    );
  }


  function calcDimensions() {
    boxDiv.cumulativeLeft = 0;
    var o = boxDiv;
    do { boxDiv.cumulativeLeft += o.offsetLeft; } while (o = o.offsetParent);

    pageWidth = pageDivs[0].offsetWidth;
    colWidth = pageDivs[0].bodyText.offsetWidth;
    for (var i = 0; i < pageDivs.length; ++i) {
      pageDivs[i].content.style.webkitColumnWidth = colWidth + "px";
    }

    pageDivs[0].content.dirty = true;
    pageDivs[1].content.dirty = true;

    goToPage(pageDivs[0].pageNumber || 1);
    setX(pageDivs[1], 0 - (pageWidth + 10), 'now');
  }


  function goToPage(pageN, componentId) {
    setPage(pageDivs[0], pageN, componentId);
    setPage(pageDivs[1], pageN, componentId);
    completedTurn();
  }


  function goToChapter(chapterId, componentId) {
    if (!setPage(pageDivs[0], 1, componentId)) { return; }

    var pageNum = 1;
    if (chapterId) {
      var chaps = pageDivs[0].content.componentData.chapters;
      for (var i = chaps.length - 1; i <= 0; --i) {
        if (chaps[i].id == chapterId) {
          pageNum = chaps[i].page;
          break;
        }
      }
    }

    setPage(pageDivs[1], pageNum, componentId);
    if (pageNum != 1) {
      setPage(pageDivs[0], chapPage, componentId);
    }
  }


  function getLocation() {
    var ct = pageDivs[0].content;
    var pageN = pageDivs[0].pageNumber;
    var chapter = null;
    for (var i = 0; i < ct.componentData.chapters.length; ++i) {
      if (pageN >= ct.componentData.chapters[i].page) {
        chapter = ct.componentData.chapters[i].title;
        break;
      }
    }
    return {
      component: ct.componentData.componentId,
      page: pageN,
      lastPage: ct.lastPageNumber,
      chapter: chapter
    }
  }


  function lift(boxPointX) {
    if (turnData.direction) { return; }
    if (boxPointX > pageWidth * 0.5) {
      setX(pageDivs[1], '0px', 'now');
      if (setPage(pageDivs[0], pageDivs[0].pageNumber + 1)) {
        turnData.direction = FORWARDS;
      } else {
        setX(pageDivs[1], '-110%', 'now'); // revert
      };
    } else if (boxPointX < pageWidth * 0.5) {
      if (setPage(pageDivs[1], pageDivs[1].pageNumber - 1)) {
        turnData.direction = BACKWARDS;
      }
    }
  }


  function turning(boxPointX) {
    if (!turnData.direction || turnData.completing) { return; }
    if (turnData.direction == FORWARDS && boxPointX < pageWidth * 0.5) {
      turnData.cancellable = true;
    } else if (turnData.direction == BACKWARDS && boxPointX > pageWidth * 0.5) {
      turnData.cancellable = true;
    }

    // For speed reasons, we constrain movements to ~25 per second at most.
    var stamp = (new Date()).getTime();
    if (turnData.stamp && stamp - turnData.stamp < 40) { return; }
    turnData.stamp = stamp;

    setX(pageDivs[1], boxPointX - pageWidth, { duration: 100 });
  }


  function turn(boxPointX) {
    var outOfSight = (0 - (pageWidth + 10)) + "px";
    turnData.completing = true;
    if (turnData.direction == FORWARDS) {
      if (turnData.cancellable && boxPointX > pageWidth * 0.5) {
        // Cancelling forward turn...
        setX(
          pageDivs[1],
          '0px',
          'slide',
          function () {
            setPage(pageDivs[0], pageDivs[0].pageNumber - 1);
            setX(pageDivs[1], outOfSight, 'now') ;
            completedTurn();
          }
        );
      } else {
        // Completing forward turn...
        setX(
          pageDivs[1],
          outOfSight,
          'slide',
          function () {
            setPage(pageDivs[1], pageDivs[1].pageNumber + 1);
            completedTurn();
          }
        );
      }
    } else if (turnData.direction == BACKWARDS) {
      if (turnData.cancellable && boxPointX < pageWidth * 0.5) {
        // Cancelling backward turn...
        setX(
          pageDivs[1],
          outOfSight,
          'slide',
          function () {
            setPage(pageDivs[1], pageDivs[1].pageNumber + 1);
            completedTurn();
          }
        );
      } else {
        // Completing backward turn...
        setX(
          pageDivs[1],
          '0px',
          'slide',
          function () {
            setPage(pageDivs[0], pageDivs[0].pageNumber - 1);
            setX(pageDivs[1], outOfSight, 'now');
            completedTurn();
          }
        );
      }
    }
  }


  function completedTurn() {
    turnData = {};
    var turnEvt = document.createEvent("Events");
    turnEvt.initEvent("carlyle:turn", false, true);
    boxDiv.dispatchEvent(turnEvt);
  }



  function setX(elem, x, options, callback) {
    if (typeof(x) == "number") { x = x + "px"; }
    elem.style.webkitTransform = 'translateX('+x+')';

    var transition;
    var duration;

    // Shorthand for common configurations.
    if (options == "slide") {
      options = {};
    } else if (options == 'now') {
      options = { duration: 0 };
    }

    if (options['duration'] == 0) {
      duration = 0;
      transition = 'none';
    } else {
      duration = parseInt(options['duration']) || 200; // FIXME: Magic 200!
      transition = '-webkit-transform';
      transition += ' ' + duration + "ms";
      transition += ' ' + (options['timing'] || 'linear');
      transition += ' ' + (options['delay'] || 0) + 'ms';
    }
    elem.style.webkitTransition = transition;
    if (elem.setXTransitionCallback) {
      clearTimeout(elem.setXTransitionCallback);
    }
    if (callback) {
      elem.setXTransitionCallback = setTimeout(callback, duration + 1);
    }
  }


  function createRunningHead(page, name) {
    var runner = page[name] = document.createElement('div');
    runner.style.cssText = Carlyle.Styles.ruleText(name);
    page.appendChild(runner);

    var createRunnerPart = function (name, styleName) {
      var part = runner[name] = document.createElement('div');
      part.style.cssText = Carlyle.Styles.ruleText(styleName);
      runner.appendChild(part);
    }
    createRunnerPart('left', 'runnerLeft');
    createRunnerPart('right', 'runnerRight');
  }


  function setRunningHead(runner, text) {
    var left = runner.left.innerHTML;
    var right = runner.right.innerHTML;
    if (typeof(text) == "string") {
      left = text;
      right = "";
    } else {
      left = text.left || left;
      right = text.right || right;
    }
    runner.left.innerHTML = left;
    runner.right.innerHTML = right;
  }


  function setPage(pageElement, pageN, componentId) {
    pageN = book.preparePageFor(pageElement.content, pageN, componentId);
    if (!pageN) { return false; } // Book may disallow movement to this page.
    pageElement.pageNumber = pageN;
    pageElement.bodyText.scrollLeft = (pageN - 1) * colWidth;
    setRunningHead(
      pageElement.footer,
      {
        left: getLocation().chapter,
        right: pageN
      }
    );
    return pageN;
  }


  function spin() {
    if (spinnerCanvas) { return; }
    spinnerCanvas = document.createElement("canvas");
    boxDiv.appendChild(spinnerCanvas);
    containerDiv.style.visibility = "hidden";
    spinnerCanvas.style.cssText = Carlyle.Styles.ruleText('spinner');

    var ctx = spinnerCanvas.getContext("2d");
    var w = spinnerCanvas.clientWidth, h = spinnerCanvas.clientHeight;
    var currentOffset = 0;
    var bars = 10;
    var innerRadius = w * 0.4;
    var size = { width: w * 0.16, height: w * 0.4 };
    var framerate = 1000 / 10;

    spinnerCanvas.tick = setInterval(
      function () {
        currentOffset = (currentOffset + 1) % bars;
        ctx.save();
        ctx.scale(1.5, 0.75);
        ctx.clearRect(0, 0, w*2, h*2);
        ctx.translate(w, h);
        for(var i = 0; i < bars; ++i){
          var curbar = (currentOffset+i) % bars;
          var angle = 2 * curbar * Math.PI / bars;
          ctx.save();
          ctx.translate(
            innerRadius * Math.sin(-angle),
            innerRadius * Math.cos(-angle)
          );
          ctx.rotate(angle);
          ctx.fillStyle = "rgba(0,12,48,"+(bars+1-i)/(bars+1)+")";
          ctx.fillRect(-2, 0, size.width, size.height);
          ctx.restore();
        }
        ctx.restore();
      },
      framerate
    );
  }


  function spun() {
    if (!spinnerCanvas) { return; }
    containerDiv.style.visibility = "visible";
    clearTimeout(spinnerCanvas.tick);
    boxDiv.removeChild(spinnerCanvas);
    spinnerCanvas = null;
  }


  function listenForInteraction() {
    function rebaseX(x) {
      return Math.max(
        0,
        Math.min(boxDiv.offsetWidth, x - boxDiv.cumulativeLeft)
      );
    }

    // Listeners
    // FIXME: a better way to detect whether touch events are supported?
    // FIXME: should everything be register with useCapture false?
    var mob = navigator.userAgent.toLowerCase().search(/webkit.* mobile/) > 0;
    if (!mob) {
      containerDiv.addEventListener(
        'mousedown',
        function (evt) {
          evt.preventDefault();
          lift(rebaseX(evt.pageX));
          containerDiv.onmousemove = function (mmevt) {
            mmevt.preventDefault();
            turning(rebaseX(mmevt.pageX));
          }
        },
        false
      );
      containerDiv.addEventListener(
        'mouseup',
        function (evt) {
          evt.preventDefault();
          containerDiv.onmousemove = null;
          if (!turnData.direction) { return; }
          turn(rebaseX(evt.pageX));
        },
        false
      );
      containerDiv.addEventListener(
        'mouseout',
        function (evt) {
          if (!turnData.direction) { return; }
          obj = evt.relatedTarget;
          while (obj = obj.parentNode) {
            if (obj == containerDiv) { return; }
          }
          evt.preventDefault();
          turn(rebaseX(evt.pageX));
        },
        false
      );
    } else {
      containerDiv.addEventListener(
        'touchstart',
        function (evt) {
          evt.preventDefault();
          if (evt.targetTouches.length > 1) { return; }
          lift(rebaseX(evt.targetTouches[0].pageX));
        },
        false
      );
      containerDiv.addEventListener(
        'touchmove',
        function (evt) {
          evt.preventDefault();
          if (!turnData.direction) { return; }
          if (evt.targetTouches.length > 1) { return; }
          var rawX = evt.targetTouches[0].pageX - boxDiv.cumulativeLeft;
          var rbX = rebaseX(evt.targetTouches[0].pageX);
          if (rawX < 0 || rawX > boxDiv.offsetWidth) {
            turn(rbX);
          } else {
            turning(rbX);
          }
        },
        false
      );
      containerDiv.addEventListener(
        'touchend',
        function (evt) {
          evt.preventDefault();
          if (!turnData.direction) { return; }
          turn(rebaseX(evt.changedTouches[0].pageX));
        },
        false
      );
      containerDiv.addEventListener(
        'touchcancel',
        function (evt) {
          if (!turnData.direction) { return; }
          evt.preventDefault();
          turn(rebaseX(evt.changedTouches[0].pageX));
        }
      );
      window.addEventListener('orientationchange', resized, false);
    }
  }


  initialize(node, bookData);


  var PublicAPI = {
    constructor: Carlyle.Reader,
    setBook: setBook,
    getBook: getBook,
    goToPage: goToPage,
    goToChapter: goToChapter,
    getLocation: getLocation,
    resized: resized,
    spin: spin,
    spun: spun
  }

  return PublicAPI;
}



/* STYLES */
Carlyle.Styles = {
  ruleText: function(rule) {
    if (!this[rule]) { return ""; }
    var parts = [];
    for (var declaration in this[rule]) {
      parts.push(declaration + ": " + this[rule][declaration] + ";")
    }
    return parts.join(" ");
  },

  container: {
    "position": "absolute",
    "width": "100%",
    "height": "100%",
    "background": "#FFF",
    "-webkit-user-select": "none",
    "-webkit-text-size-adjust": "none"
  },

  page: {
    "position": "absolute",
    "top": 0,
    "left": 0,
    "bottom": "3px",
    "right": "5px",
    "background": "#FFF",
    "cursor": "pointer",
    "-webkit-box-shadow": "2px 0 3px #777",
  },

  overPage: {
    "-webkit-transform": "translateX(-110%)",
    "-webkit-transform-style": "preserve-3d"
  },

  header: {
    "position": "absolute",
    "top": "4px",
    "left": "1em",
    "right": "1em",
    "color": "#AAA",
    "text-transform": "uppercase"
  },

  footer: {
    "position": "absolute",
    "bottom": "4px",
    "left": "1em",
    "right": "1em",
    "color": "#AAA",
    "text-transform": "uppercase"
  },

  runnerLeft: {
    "float": "left",
    "font-size": "80%",
    "white-space": "nowrap",
    "text-overflow": "ellipsis",
    "overflow": "hidden",
    "width": "50%"
  },

  runnerRight: {
    "float": "right",
    "font-size": "80%",
    "text-align": "right",
    "white-space": "nowrap",
    "width": "50%"
  },

  bodyText: {
    "position": "absolute",
    "top": "1.4em",
    "bottom": "1.4em",
    "left": "1em",
    "right": "1em",
    "-webkit-transform-style": "preserve-3d",
    "word-wrap": "break-word",
    "overflow": "hidden"
  },

  content: {
    "position": "absolute",
    "top": 0,
    "bottom": 0,
    "min-width": "200%",
    "font-size": "13pt",
    "-webkit-text-size-adjust": "none",
    "-webkit-column-gap": 0,
    "-webkit-column-fill": "auto",
    "-webkit-transform-style": "preserve-3d"
  },

  spinner: {
    "width": "48px",
    "height": "48px",
    "position": "relative",
    "display": "block",
    "margin": "auto"
  }
}
