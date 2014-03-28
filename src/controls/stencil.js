Monocle.Controls.Stencil = function (reader, behaviorClasses) {

  var API = { constructor: Monocle.Controls.Stencil }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    behaviors: [],
    components: {},
    masks: []
  }


  // Create the stencil container and listen for draw/update events.
  //
  function createControlElements(holder) {
    behaviorClasses = behaviorClasses || k.DEFAULT_BEHAVIORS;
    for (var i = 0, ii = behaviorClasses.length; i < ii; ++i) {
      addBehavior(behaviorClasses[i]);
    }
    p.container = holder.dom.make('div', k.CLS.container);
    p.reader.listen('monocle:turning', hide);
    p.reader.listen('monocle:turn:cancel', show);
    p.reader.listen('monocle:turn', update);
    p.reader.listen('monocle:stylesheetchange', update);
    p.reader.listen('monocle:resize', update);
    update();
    return p.container;
  }


  // Pass this method an object that responds to 'findElements(doc)' with
  // an array of DOM elements for that document, and to 'fitMask(elem, mask)'.
  //
  // After you have added all your behaviors this way, you would typically
  // call update() to make them take effect immediately.
  //
  function addBehavior(bhvrClass) {
    var bhvr = new bhvrClass(API);
    if (typeof bhvr.findElements != 'function') {
      console.warn('Missing "findElements" method for behavior: %o', bhvr);
    }
    if (typeof bhvr.fitMask != 'function') {
      console.warn('Missing "fitMask" method for behavior: %o', bhvr);
    }
    p.behaviors.push(bhvr);
  }


  // Resets any pre-calculated rectangles for the active component,
  // recalculates them, and forces masks to be "drawn" (moved into the new
  // rectangular locations).
  //
  function update() {
    var visPages = p.reader.visiblePages();
    if (!visPages || !visPages.length) { return; }
    var pageDiv = visPages[0];
    var cmptId = pageComponentId(pageDiv);
    if (!cmptId) { return; }
    p.components[cmptId] = null;
    calculateRectangles(pageDiv);
    draw();
  }


  function hide() {
    p.container.style.display = 'none';
  }


  function show() {
    p.container.style.display = 'block';
  }


  // Removes any existing masks.
  function clear() {
    while (p.container.childNodes.length) {
      p.container.removeChild(p.container.lastChild);
    }
  }


  // Aligns the stencil container to the shape of the page, then moves the
  // masks to sit above any currently visible rectangles.
  //
  function draw() {
    var pageDiv = p.reader.visiblePages()[0];
    var cmptId = pageComponentId(pageDiv);
    if (!p.components[cmptId]) {
      return;
    }

    // Position the container.
    alignToComponent(pageDiv);

    // Clear old masks.
    clear();

    // Layout the masks.
    if (!p.disabled) {
      show();
      var rects = p.components[cmptId];
      if (rects && rects.length) {
        layoutRectangles(pageDiv, rects);
      }
    }
  }


  // Iterate over all the <a> elements in the active component, and
  // create an array of rectangular points corresponding to their positions.
  //
  function calculateRectangles(pageDiv) {
    var cmptId = pageComponentId(pageDiv);
    if (!p.components[cmptId]) {
      p.components[cmptId] = [];
    } else {
      return;
    }
    var boxes = p.components[cmptId];

    var doc = pageDiv.m.activeFrame.contentDocument;
    var offset = getOffset(pageDiv);

    for (var b = 0, bb = p.behaviors.length; b < bb; ++b) {
      var bhvr = p.behaviors[b];
      var elems = bhvr.findElements(doc);
      for (var i = 0; i < elems.length; ++i) {
        var elem = elems[i];
        // Ensure that we're not already masking this element.
        for (var k = 0, kk = boxes.length; k < kk; ++k) {
          if (boxes[k].element == elem) {
            elem = null;
            break;
          }
        }
        if (elem) {
          var elemBoxes = boxesForNode(elem, offset);
          for (var j = 0, jj = elemBoxes.length; j < jj; ++j) {
            elemBoxes[j].element = elem;
            elemBoxes[j].behavior = bhvr;
            boxes.push(elemBoxes[j]);
          }
        }
      }
    }

    return p.components[cmptId];
  }


  function boxesForNode(node, offset) {
    var boxes = [];
    if (typeof node.childNodes != 'undefined' && node.childNodes.length) {
      for (var i = 0, ii = node.childNodes.length; i < ii; ++i) {
        boxes = boxes.concat(boxesForNode(node.childNodes[i], offset));
      }
    } else {
      var rng = node.ownerDocument.createRange();
      rng.selectNodeContents(node);
      var r = rng.getClientRects();
      for (var i = 0, ii = r.length; i < ii; ++i) {
        var offl = Monocle.Browser.env.widthsIgnoreTranslate ? 0 : offset.l;
        boxes.push({
          left: Math.ceil(r[i].left + offl),
          top: Math.ceil(r[i].top),
          width: Math.floor(r[i].width),
          height: Math.floor(r[i].height)
        });
      }
    }
    return boxes;
  }


  // Update location of visible rectangles - creating as required.
  //
  function layoutRectangles(pageDiv, rects) {
    var offset = getOffset(pageDiv);
    var visRects = [];
    for (var i = 0; i < rects.length; ++i) {
      if (rectVisible(rects[i], offset.l, offset.l + offset.w)) {
        visRects.push(rects[i]);
      }
    }

    for (i = 0; i < visRects.length; ++i) {
      var r = visRects[i];
      var cr = {
        left: r.left - offset.l,
        top: r.top,
        width: r.width,
        height: r.height
      };
      var mask = createMask(r.element, r.behavior);
      mask.dom.setStyles({
        display: 'block',
        left: cr.left+"px",
        top: cr.top+"px",
        width: cr.width+"px",
        height: cr.height+"px",
        position: 'absolute'
      });
      mask.stencilRect = cr;
    }
  }


  // Find the offset position in pixels from the left of the current page.
  //
  function getOffset(pageDiv) {
    return {
      l: pageDiv.m.offset || 0,
      w: pageDiv.m.dimensions.properties.width
    };
  }


  // Is this area presently on the screen?
  //
  function rectVisible(rect, l, r) {
    var mid = rect.left + (rect.width * 0.5);
    return mid >= l && mid < r;
  }


  // Returns the active component id for the given page, or the current
  // page if no argument passed in.
  //
  function pageComponentId(pageDiv) {
    pageDiv = pageDiv || p.reader.visiblePages()[0];
    if (!pageDiv.m.activeFrame.m.component) { return; }
    return pageDiv.m.activeFrame.m.component.properties.id;
  }


  // Positions the stencil container over the active frame.
  //
  function alignToComponent(pageDiv) {
    var cmpt = pageDiv.m.activeFrame.parentNode;
    p.container.dom.setStyles({
      left: cmpt.offsetLeft+"px",
      top: cmpt.offsetTop+"px"
    });
  }


  function createMask(element, bhvr) {
    var mask = p.container.dom.append(bhvr.maskTagName || 'div', k.CLS.mask);
    Monocle.Events.listenForContact(mask, {
      start: function () { p.reader.dispatchEvent('monocle:magic:halt'); },
      move: function (evt) { evt.preventDefault(); },
      end: function () { p.reader.dispatchEvent('monocle:magic:init'); }
    });
    bhvr.fitMask(element, mask);
    return mask;
  }


  // Make the active masks visible (by giving them a class -- override style
  // in monoctrl.css).
  //
  function toggleHighlights() {
    var cls = k.CLS.highlights;
    if (p.container.dom.hasClass(cls)) {
      p.container.dom.removeClass(cls);
    } else {
      p.container.dom.addClass(cls);
    }
  }


  API.createControlElements = createControlElements;
  API.addBehavior = addBehavior;
  API.draw = draw;
  API.update = update;
  API.toggleHighlights = toggleHighlights;

  return API;
}


Monocle.Controls.Stencil.CLS = {
  container: 'controls_stencil_container',
  mask: 'controls_stencil_mask',
  highlights: 'controls_stencil_highlighted'
}



Monocle.Controls.Stencil.Links = function (stencil) {
  var API = { constructor: Monocle.Controls.Stencil.Links }

  // Optionally specify the HTML tagname of the mask.
  API.maskTagName = 'a';

  // Returns an array of all the elements in the given doc that should
  // be covered with a stencil mask for interactivity.
  //
  // (Hint: doc.querySelectorAll() is your friend.)
  //
  API.findElements = function (doc) {
    return doc.querySelectorAll('a[href]');
  }


  // Return an element. It should usually be a child of the container element,
  // with a className of the given maskClass. You set up the interactivity of
  // the mask element here.
  //
  API.fitMask = function (link, mask) {
    var hrefObject = deconstructHref(link);
    var rdr = stencil.properties.reader;
    var evtData = { href: hrefObject, link: link, mask: mask }

    if (hrefObject.pass) {
      mask.onclick = function (evt) { return link.click(); }
    } else {
      link.onclick = function (evt) {
        evt.preventDefault();
        return false;
      }
      if (hrefObject.internal) {
        mask.setAttribute('href', 'javascript:"Skip to chapter"');
        mask.onclick = function (evt) {
          if (rdr.dispatchEvent('monocle:link:internal', evtData, true)) {
            rdr.skipToChapter(hrefObject.internal);
          }
          evt.preventDefault();
          return false;
        }
      } else {
        mask.setAttribute('href', hrefObject.external);
        mask.setAttribute('target', '_blank');
        mask.onclick = function (evt) {
          return rdr.dispatchEvent('monocle:link:external', evtData, true);
        }
      }
    }
  }


  // Returns an object with either:
  //
  // - an 'external' property -- an absolute URL with a protocol,
  // host & etc, which should be treated as an external resource (eg,
  // open in new window)
  //
  //   OR
  //
  // - an 'internal' property -- a relative URL (with optional hash anchor),
  //  that is treated as a link to component in the book
  //
  // A weird but useful property of <a> tags is that while
  // link.getAttribute('href') will return the actual string value of the
  // attribute (eg, 'foo.html'), link.href will return the absolute URL (eg,
  // 'http://example.com/monocles/foo.html').
  //
  function deconstructHref(elem) {
    var loc = document.location;
    var origin = loc.protocol+'//'+loc.host;
    var href = elem.href;
    var path = href.substring(origin.length);
    var ext = { external: href };

    if (href.toLowerCase().match(/^javascript:/)) {
      return { pass: true };
    }

    // Anchor tags with 'target' attributes are always external URLs.
    if (elem.getAttribute('target')) {
      return ext;
    }
    // URLs with a different protocol or domain are always external.
    //console.log("Domain test: %s <=> %s", origin, href);
    if (href.indexOf(origin) !== 0) {
      return ext;
    }

    // If it is in a sub-path of the current path, it's internal.
    var topPath = loc.pathname.replace(/[^\/]*\.[^\/]+$/,'');
    if (topPath[topPath.length - 1] != '/') {
      topPath += '/';
    }
    //console.log("Sub-path test: %s <=> %s", topPath, path);
    if (path.indexOf(topPath) === 0) {
      return { internal: path.substring(topPath.length) }
    }

    // If it's a root-relative URL and it's in our list of component ids,
    // it's internal.
    var cmptIds = stencil.properties.reader.getBook().properties.componentIds;
    for (var i = 0, ii = cmptIds.length; i < ii; ++i) {
      //console.log("Component test: %s <=> %s", cmptIds[i], path);
      if (path.indexOf(cmptIds[i]) === 0) {
        return { internal: path }
      }
    }

    // Otherwise it's external.
    return ext;
  }


  return API;
}


Monocle.Controls.Stencil.DEFAULT_BEHAVIORS = [Monocle.Controls.Stencil.Links];
