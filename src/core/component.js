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

    // Prevent about:blank overriding imported nodes in Firefox.
    // Disabled again because it seems to result in blank pages in Saf.
    //frame.contentWindow.stop();

    if (p.source.html || (typeof p.source == "string")) {   // HTML
      return loadFrameFromHTML(p.source.html || p.source, frame, callback);
    } else if (p.source.javascript) {                       // JAVASCRIPT
      //console.log("Loading as javascript: "+p.source.javascript);
      return loadFrameFromJavaScript(p.source.javascript, frame, callback);
    } else if (p.source.url) {                              // URL
      return loadFrameFromURL(p.source.url, frame, callback);
    } else if (p.source.nodes) {                            // NODES
      return loadFrameFromNodes(p.source.nodes, frame, callback);
    } else if (p.source.doc) {                              // DOCUMENT
      return loadFrameFromDocument(p.source.doc, frame, callback);
    }
  }


  // LOAD STRATEGY: HTML
  // Loads a HTML string into the given frame, invokes the callback once loaded.
  //
  // Cleans the string so it can be used in a JavaScript statement. This is
  // slow, so if the string is already clean, skip this and use
  // loadFrameFromJavaScript directly.
  //
  function loadFrameFromHTML(src, frame, callback) {
    // Compress whitespace.
    src = src.replace(/\n/g, '\\n').replace(/\r/, '\\r');

    // Escape single-quotes.
    src = src.replace(/\'/g, '\\\'');

    // Remove scripts. (DISABLED -- Monocle should leave this to implementers.)
    //var scriptFragment = "<script[^>]*>([\\S\\s]*?)<\/script>";
    //src = src.replace(new RegExp(scriptFragment, 'img'), '');

    // BROWSERHACK: Gecko chokes on the DOCTYPE declaration.
    if (Monocle.Browser.is.Gecko) {
      var doctypeFragment = "<!DOCTYPE[^>]*>";
      src = src.replace(new RegExp(doctypeFragment, 'm'), '');
    }

    loadFrameFromJavaScript(src, frame, callback);
  }


  // LOAD STRATEGY: JAVASCRIPT
  // Like the HTML strategy, but assumes that the src string is already clean.
  //
  function loadFrameFromJavaScript(src, frame, callback) {
    src = "javascript:'"+src+"';";
    frame.onload = function () {
      frame.onload = null;
      Monocle.defer(callback);
    }
    frame.src = src;
  }


  // LOAD STRATEGY: URL
  // Loads the URL into the given frame, invokes callback once loaded.
  //
  function loadFrameFromURL(url, frame, callback) {
    // If it's a relative path, we need to make it absolute, using the
    // reader's location (not the active component's location).
    if (!url.match(/^\//)) {
      var link = document.createElement('a');
      link.setAttribute('href', url);
      url = link.href;
      delete(link);
    }
    frame.onload = function () {
      frame.onload = null;
      Monocle.defer(callback);
    }
    frame.contentWindow.location.replace(url);
  }


  // LOAD STRATEGY: NODES
  // Loads the array of DOM nodes into the body of the frame (replacing all
  // existing nodes), then invokes the callback.
  //
  function loadFrameFromNodes(nodes, frame, callback) {
    var destDoc = frame.contentDocument;
    destDoc.documentElement.innerHTML = "";
    var destHd = destDoc.createElement("head");
    var destBdy = destDoc.createElement("body");

    for (var i = 0; i < nodes.length; ++i) {
      var node = destDoc.importNode(nodes[i], true);
      destBdy.appendChild(node);
    }

    var oldHead = destDoc.getElementsByTagName('head')[0];
    if (oldHead) {
      destDoc.documentElement.replaceChild(destHd, oldHead);
    } else {
      destDoc.documentElement.appendChild(destHd);
    }
    if (destDoc.body) {
      destDoc.documentElement.replaceChild(destBdy, destDoc.body);
    } else {
      destDoc.documentElement.appendChild(destBdy);
    }

    if (callback) { callback(); }
  }


  // LOAD STRATEGY: DOCUMENT
  // Replaces the DocumentElement of the given frame with the given srcDoc.
  // Invokes the callback when loaded.
  //
  function loadFrameFromDocument(srcDoc, frame, callback) {
    var destDoc = frame.contentDocument;

    var srcBases = srcDoc.getElementsByTagName('base');
    if (srcBases[0]) {
      var head = destDoc.getElementsByTagName('head')[0];
      if (!head) {
        try {
          head = destDoc.createElement('head');
          if (destDoc.body) {
            destDoc.insertBefore(head, destDoc.body);
          } else {
            destDoc.appendChild(head);
          }
        } catch (e) {
          head = destDoc.body;
        }
      }
      var bases = destDoc.getElementsByTagName('base');
      var base = bases[0] ? bases[0] : destDoc.createElement('base');
      base.setAttribute('href', srcBases[0].getAttribute('href'));
      head.appendChild(base);
    }

    destDoc.replaceChild(
      destDoc.importNode(srcDoc.documentElement, true),
      destDoc.documentElement
    );

    // DISABLED: immediate readiness - webkit has some difficulty with this.
    // if (callback) { callback(); }

    Monocle.defer(callback);
  }


  // Once a frame is loaded with this component, call this method to style
  // and measure its contents.
  //
  function setupFrame(pageDiv, frame, callback) {
    // iOS touch events on iframes are busted. See comments in
    // events.js for an explanation of this hack.
    //
    Monocle.Events.listenOnIframe(frame);

    var doc = frame.contentDocument;
    var evtData = { 'page': pageDiv, 'document': doc, 'component': API };

    // Announce that the component is loaded.
    pageDiv.m.reader.dispatchEvent('monocle:componentmodify', evtData);

    updateDimensions(pageDiv, function () {
      frame.style.visibility = "visible";

      // Find the place of any chapters in the component.
      locateChapters(pageDiv);

      // Announce that the component has changed.
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
      if (typeof callback == "function") { callback() };
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


  API.applyTo = applyTo;
  API.updateDimensions = updateDimensions;
  API.chapterForPage = chapterForPage;
  API.pageForChapter = pageForChapter;
  API.pageForXPath = pageForXPath;
  API.pageForSelector = pageForSelector;
  API.lastPageNumber = lastPageNumber;

  return API;
}

Monocle.pieceLoaded('core/component');
