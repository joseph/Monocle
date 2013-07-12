/* COMPONENT */

// See the properties declaration for details of constructor arguments.
//
Monocle.Component = function (book, id, index, chapters, source) {

  var API = { constructor: Monocle.Component }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    // a back-reference to the public API of the book that owns this component
    book: book,

    // the string that represents this component in the book's component array
    id: id,

    // the position in the book's components array of this component
    index: index,

    // The chapters argument is an array of objects that list the chapters that
    // can be found in this component. A chapter object is defined as:
    //
    //  {
    //     title: str,
    //     fragment: str, // optional anchor id
    //     percent: n     // how far into the component the chapter begins
    //  }
    //
    // NOTE: the percent property is calculated by the component - you only need
    // to pass in the title and the optional id string.
    //
    chapters: chapters,

    // the frame provided by dataSource.getComponent() for this component
    source: source
  }


  // Makes this component the active component for the pageDiv. There are
  // several strategies for this (see loadFrame).
  //
  // When the component has been loaded into the pageDiv's frame, the callback
  // will be invoked with the pageDiv and this component as arguments.
  //
  function applyTo(pageDiv, callback) {
    prepareSource(pageDiv.m.reader);

    var evtData = { 'page': pageDiv, 'source': p.source };
    pageDiv.m.reader.dispatchEvent('monocle:componentchanging', evtData);

    var onLoaded = function () {
      setupFrame(
        pageDiv,
        pageDiv.m.activeFrame,
        function () { callback(pageDiv, API) }
      );
    }

    Monocle.defer(function () { loadFrame(pageDiv, onLoaded); });
  }


  // Loads this component into the given frame, using one of the following
  // strategies:
  //
  // * HTML - a HTML string
  // * URL - a URL string
  // * Nodes - an array of DOM body nodes (NB: no way to populate head)
  // * Document - a DOM DocumentElement object
  //
  function loadFrame(pageDiv, callback) {
    var frame = pageDiv.m.activeFrame;

    // We own this frame now.
    frame.m.component = API;

    // Hide the frame while we're changing it.
    frame.style.visibility = "hidden";

    frame.whenDocumentReady = function () {
      var doc = frame.contentDocument;
      var evtData = { 'page': pageDiv, 'document': doc, 'component': API };
      pageDiv.m.reader.dispatchEvent('monocle:componentmodify', evtData);
      frame.whenDocumentReady = null;
    }

    if (p.source.html) {
      return loadFrameFromHTML(p.source.html || p.source, frame, callback);
    } else if (p.source.url) {
      return loadFrameFromURL(p.source.url, frame, callback);
    } else if (p.source.doc) {
      return loadFrameFromDocument(p.source.doc, frame, callback);
    }
  }


  // LOAD STRATEGY: HTML
  // Loads a HTML string into the given frame, invokes the callback once loaded.
  //
  function loadFrameFromHTML(src, frame, callback) {
    var fn = function () {
      Monocle.Events.deafen(frame, 'load', fn);
      frame.whenDocumentReady();
      Monocle.defer(callback);
    }
    Monocle.Events.listen(frame, 'load', fn);
    if (Monocle.Browser.env.loadHTMLWithDocWrite) {
      frame.contentDocument.open('text/html', 'replace');
      frame.contentDocument.write(src);
      frame.contentDocument.close();
    } else {
      frame.contentWindow['monCmptData'] = src;
      frame.src = "javascript:window['monCmptData'];"
    }
  }


  // LOAD STRATEGY: URL
  // Loads the URL into the given frame, invokes callback once loaded.
  //
  function loadFrameFromURL(url, frame, callback) {
    // If it's a relative path, we need to make it absolute.
    if (!url.match(/^\//)) {
      url = absoluteURL(url);
    }
    var onDocumentReady = function () {
      Monocle.Events.deafen(frame, 'load', onDocumentReady);
      frame.whenDocumentReady();
    }
    var onDocumentLoad = function () {
      Monocle.Events.deafen(frame, 'load', onDocumentLoad);
      Monocle.defer(callback);
    }
    Monocle.Events.listen(frame, 'load', onDocumentReady);
    Monocle.Events.listen(frame, 'load', onDocumentLoad);
    frame.contentWindow.location.replace(url);
  }


  // LOAD STRATEGY: DOCUMENT
  // Replaces the DocumentElement of the given frame with the given srcDoc.
  // Invokes the callback when loaded.
  //
  function loadFrameFromDocument(srcDoc, frame, callback) {
    var doc = frame.contentDocument;

    // WebKit has an interesting quirk. The <base> tag must exist in the
    // document being replaced, not the new document.
    if (Monocle.Browser.is.WebKit) {
      var srcBase = srcDoc.querySelector('base');
      if (srcBase) {
        var head = doc.querySelector('head');
        if (!head) {
          try {
            head = doc.createElement('head');
            prependChild(doc.documentElement, head);
          } catch (e) {
            head = doc.body;
          }
        }
        var base = doc.createElement('base');
        base.setAttribute('href', srcBase.href);
        head.appendChild(base);
      }
    }

    doc.replaceChild(
      doc.importNode(srcDoc.documentElement, true),
      doc.documentElement
    );

    // NB: It's a significant problem with this load strategy that there's
    // no indication when it is complete.
    Monocle.defer(callback);
  }


  // Once a frame is loaded with this component, call this method to style
  // and measure its contents.
  //
  function setupFrame(pageDiv, frame, callback) {
    updateDimensions(pageDiv, function () {
      frame.style.visibility = "visible";

      // Find the place of any chapters in the component.
      locateChapters(pageDiv);

      // Nothing can prevent iframe scrolling on Android, so we have to undo it.
      if (Monocle.Browser.on.Android) {
        Monocle.Events.listen(frame.contentWindow, 'scroll', function () {
          frame.contentWindow.scrollTo(0,0);
        });
      }

      // Announce that the component has changed.
      var doc = frame.contentDocument;
      var evtData = { 'page': pageDiv, 'document': doc, 'component': API };
      pageDiv.m.reader.dispatchEvent('monocle:componentchange', evtData);

      callback();
    });
  }


  // Checks whether the pageDiv dimensions have changed. If they have,
  // remeasures dimensions and returns true. Otherwise returns false.
  //
  function updateDimensions(pageDiv, callback) {
    pageDiv.m.dimensions.update(function (pageLength) {
      p.pageLength = pageLength;
      if (typeof callback == "function") { callback() }
    });
  }


  // Iterates over all the chapters that are within this component
  // (according to the array we were provided on initialization) and finds
  // their location (in percentage terms) within the text.
  //
  // Stores this percentage with the chapter object in the chapters array.
  //
  function locateChapters(pageDiv) {
    if (p.chapters[0] && typeof p.chapters[0].percent == "number") {
      return;
    }
    var doc = pageDiv.m.activeFrame.contentDocument;
    for (var i = 0; i < p.chapters.length; ++i) {
      var chp = p.chapters[i];
      chp.percent = 0;
      if (chp.fragment) {
        var node = doc.getElementById(chp.fragment);
        chp.percent = pageDiv.m.dimensions.percentageThroughOfNode(node);
      }
    }
    return p.chapters;
  }


  // For a given page number within the component, return the chapter that
  // starts on or most-recently-before this page.
  //
  // Useful, for example, in displaying the current chapter title as a
  // running head on the page.
  //
  function chapterForPage(pageN) {
    var cand = null;
    var percent = (pageN - 1) / p.pageLength;
    for (var i = 0; i < p.chapters.length; ++i) {
      if (percent >= p.chapters[i].percent) {
        cand = p.chapters[i];
      } else {
        return cand;
      }
    }
    return cand;
  }


  // For a given chapter fragment (the bit after the hash
  // in eg, "index.html#foo"), return the page number on which
  // the chapter starts. If the fragment is null or blank, will
  // return the first page of the component.
  //
  function pageForChapter(fragment, pageDiv) {
    if (!fragment) {
      return 1;
    }
    for (var i = 0; i < p.chapters.length; ++i) {
      if (p.chapters[i].fragment == fragment) {
        return percentToPageNumber(p.chapters[i].percent);
      }
    }
    var doc = pageDiv.m.activeFrame.contentDocument;
    var node = doc.getElementById(fragment);
    var percent = pageDiv.m.dimensions.percentageThroughOfNode(node);
    return percentToPageNumber(percent);
  }


  function pageForXPath(xpath, pageDiv) {
    var doc = pageDiv.m.activeFrame.contentDocument;
    var percent = 0;
    if (Monocle.Browser.env.supportsXPath) {
      var node = doc.evaluate(xpath, doc, null, 9, null).singleNodeValue;
      if (node) {
        percent = pageDiv.m.dimensions.percentageThroughOfNode(node);
      }
    } else {
      console.warn("XPath not supported in this client.");
    }
    return percentToPageNumber(percent);
  }


  function pageForSelector(selector, pageDiv) {
    var doc = pageDiv.m.activeFrame.contentDocument;
    var percent = 0;
    if (Monocle.Browser.env.supportsQuerySelector) {
      var node = doc.querySelector(selector);
      if (node) {
        percent = pageDiv.m.dimensions.percentageThroughOfNode(node);
      }
    } else {
      console.warn("querySelector not supported in this client.");
    }
    return percentToPageNumber(percent);
  }


  function percentToPageNumber(pc) {
    return Math.floor(pc * p.pageLength) + 1;
  }


  // A public getter for p.pageLength.
  //
  function lastPageNumber() {
    return p.pageLength;
  }


  function prepareSource(reader) {
    if (p.sourcePrepared) { return; }
    p.sourcePrepared = true;

    if (typeof p.source == "string") {
      p.source = { html: p.source };
    }

    // If supplied as escaped javascript, unescape it to HTML by evalling it.
    if (p.source.javascript) {
      console.deprecation(
        "Loading a component by 'javascript' is deprecated. " +
        "Use { 'html': src } -- no need to escape or clean the string."
      );
      var src = p.source.javascript;
      src = src.replace(/\\n/g, "\n");
      src = src.replace(/\\r/g, "\r");
      src = src.replace(/\\'/g, "'");
      p.source = { html: src };
    }

    // If supplied as DOM nodes, convert to HTML by concatenating outerHTMLs.
    if (p.source.nodes) {
      var srcs = [];
      for (var i = 0, ii = p.source.nodes.length; i < ii; ++i) {
        var node = p.source.nodes[i];
        if (node.outerHTML) {
          srcs.push(node.outerHTML);
        } else {
          var div = document.createElement('div');
          div.appendChild(node.cloneNode(true));
          srcs.push(div.innerHTML);
          delete(div);
        }
      }
      p.source = { html: srcs.join('') };
    }

    var baseURI;
    if (p.source.html && !p.source.html.match(new RegExp("<base\s.+>", "im"))) {
      baseURI = computeBaseURI(reader);
      if (baseURI) {
        p.source.html = p.source.html.replace(
          new RegExp("(<head[^>]*>)", "im"),
          '$1<base href="'+baseURI+'" />'
        );
      }
    }

    if (p.source.doc && !p.source.doc.querySelector('base')) {
      var srcHead = p.source.doc.querySelector('head') || p.source.doc.body;
      baseURI = computeBaseURI(reader);
      if (srcHead && baseURI) {
        var srcBase = p.source.doc.createElement('base');
        srcBase.setAttribute('href', baseURI);
        prependChild(srcHead, srcBase);
      }
    }
  }


  function computeBaseURI(reader) {
    var evtData = { cmptId: p.id, cmptURI: absoluteURL(p.id) }
    if (reader.dispatchEvent('monocle:component:baseuri', evtData, true)) {
      return evtData.cmptURI;
    }
  }


  function absoluteURL(url) {
    var link = document.createElement('a');
    link.setAttribute('href', url);
    var result = link.href;
    delete(link);
    return result;
  }


  function prependChild(pr, el) {
    pr.firstChild ? pr.insertBefore(el, pr.firstChild) : pr.appendChild(el);
  }


  API.applyTo = applyTo;
  API.updateDimensions = updateDimensions;
  API.chapterForPage = chapterForPage;
  API.pageForChapter = pageForChapter;
  API.pageForXPath = pageForXPath;
  API.pageForSelector = pageForSelector;
  API.lastPageNumber = lastPageNumber;

  return API;
}
