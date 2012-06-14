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
    while (p.container.childNodes.length) {
      p.container.removeChild(p.container.lastChild);
    }

    // Layout the masks.
    if (!p.disabled) {
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

    var doc = pageDiv.m.activeFrame.contentDocument;
    var offset = getOffset(pageDiv);

    for (var b = 0, bb = p.behaviors.length; b < bb; ++b) {
      var bhvr = p.behaviors[b];
      var elems = bhvr.findElements(doc);
      for (var i = 0; i < elems.length; ++i) {
        var elem = elems[i];
        if (elem.getClientRects) {
          var r = elem.getClientRects();
          for (var j = 0; j < r.length; j++) {
            p.components[cmptId].push({
              element: elem,
              behavior: bhvr,
              left: Math.ceil(r[j].left + offset.l),
              top: Math.ceil(r[j].top),
              width: Math.floor(r[j].width),
              height: Math.floor(r[j].height)
            });
          }
        }
      }
    }

    return p.components[cmptId];
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
        height: cr.height+"px"
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
    return rect.left >= l && rect.left < r;
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
    cmpt = pageDiv.m.activeFrame.parentNode;
    p.container.dom.setStyles({
      left: cmpt.offsetLeft+"px",
      top: cmpt.offsetTop+"px"
    });
  }


  function createMask(element, bhvr) {
    var mask = p.container.dom.append(bhvr.maskTagName || 'div', k.CLS.mask);
    Monocle.Events.listenForContact(mask, {
      start: function () { p.reader.dispatchEvent('monocle:magic:halt'); },
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


  function disable() {
    p.disabled = true;
    draw();
  }


  function enable() {
    p.disabled = false;
    draw();
  }


  function filterElement(elem, behavior) {
    if (typeof behavior.filterElement == 'function') {
      return behavior.filterElement(elem);
    }
    return elem;
  }


  function maskAssigned(elem, mask, behavior) {
    if (typeof behavior.maskAssigned == 'function') {
      return behavior.maskAssigned(elem, mask);
    }
    return false;
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

Monocle.Controls.Stencil.DEFAULT_BEHAVIORS = [Monocle.Controls.Stencil.Links];


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
    if (hrefObject.internal) {
      mask.setAttribute('href', 'javascript:"Skip to chapter"');
      Monocle.Events.listen(mask, 'click', function (evt) {
        stencil.properties.reader.skipToChapter(hrefObject.internal);
        evt.preventDefault();
      });
    } else {
      mask.setAttribute('href', hrefObject.external);
      mask.setAttribute('target', '_blank');
      link.setAttribute('target', '_blank'); // For good measure.
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
    var url = elem.href;
    if (!elem.getAttribute('target')) {
      var m = url.match(/([^#]*)(#.*)?$/);
      var path = m[1];
      var anchor = m[2] || '';
      var cmpts = stencil.properties.reader.getBook().properties.componentIds;
      for (var i = 0, ii = cmpts.length; i < ii; ++i) {
        if (path.substr(0 - cmpts[i].length) == cmpts[i]) {
          return { internal: cmpts[i] + anchor };
        }
      }
    }
    return { external: url };
  }

  return API;
}
