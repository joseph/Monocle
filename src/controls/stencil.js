Monocle.Controls.Stencil = function (reader) {

  var API = { constructor: Monocle.Controls.Stencil }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    components: {},
    masks: []
  }


  // Create the stencil container and listen for draw/update events.
  //
  function createControlElements(holder) {
    p.container = holder.dom.make('div', k.CLS.container);
    p.reader.listen('monocle:turn', update);
    p.reader.listen('monocle:stylesheetchange', update);
    p.reader.listen('monocle:resize', update);
    update();
    return p.container;
  }


  // Resets any pre-calculated rectangles for the active component,
  // recalculates them, and forces masks to be "drawn" (moved into the new
  // rectangular locations).
  //
  function update() {
    var pageDiv = p.reader.visiblePages()[0];
    var cmptId = pageComponentId(pageDiv);
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
    // BROWSERHACK: Gecko doesn't subtract translations from GBCR values.
    if (Monocle.Browser.is.Gecko) { offset.l = 0; }

    var elems = doc.querySelectorAll('a, img');
    for (var i = 0; i < elems.length; ++i) {
      var elem = elems[i];
      if (filterElement(elem) && elem.getClientRects) {
        var r = elem.getClientRects();
        for (var j = 0; j < r.length; j++) {
          p.components[cmptId].push({
            element: elem,
            left: Math.ceil(r[j].left + offset.l),
            top: Math.ceil(r[j].top),
            width: Math.floor(r[j].width),
            height: Math.floor(r[j].height)
          });
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
      var mask = createMask();
      var cr = {
        left: r.left - offset.l,
        top: r.top,
        width: r.width,
        height: r.height
      };
      mask.dom.setStyles({
        display: 'block',
        left: cr.left+"px",
        top: cr.top+"px",
        width: cr.width+"px",
        height: cr.height+"px"
      });
      mask.originElement = r.element;
      mask.stencilRect = cr;
      var maskIsListening = maskAssigned(r.element, mask);
      if (!maskIsListening) {
        Monocle.Events.listen(mask, 'click', maskClick);
      }
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


  function createMask() {
    var mask = p.container.dom.append('div', k.CLS.mask);
    Monocle.Events.listenForContact(mask, {
      start: function () {
        p.reader.dispatchEvent('monocle:magic:stop');
      },
      end: function () {
        p.reader.dispatchEvent('monocle:magic:init');
      }
    });
    return mask;
  }


  // Invoked when a mask is clicked -- opens external URL in new window,
  // or moves to an internal component.
  //
  function maskClick(evt) {
    var mask = evt.currentTarget;
    var originElement = mask.originElement;
    var mimicEvt = document.createEvent('MouseEvents');
    mimicEvt.initMouseEvent(
      'click',
      true,
      true,
      document.defaultView,
      evt.detail,
      evt.screenX,
      evt.screenY,
      evt.screenX,
      evt.screenY,
      evt.ctrlKey,
      evt.altKey,
      evt.shiftKey,
      evt.metaKey,
      evt.which,
      null
    );
    originElement.dispatchEvent(mimicEvt);
  }


  // Make the active masks visible (by giving them a class -- override style
  // in monocle.css).
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


  function filterElement(elem) {
    if (elem.tagName.toLowerCase() == 'img') {
      return elem;
    }

    if (!elem.href) {
      return false;
    }

    var hrefObject = deconstructHref(elem);
    elem.setAttribute('target', '_blank');
    Monocle.Events.listen(elem, 'click', function (evt) {
      if (evt.defaultPrevented) { // NB: unfortunately not supported in Gecko.
        return;
      }
      if (!hrefObject || hrefObject.external) { return; }
      p.reader.skipToChapter(hrefObject.internal);
      evt.preventDefault();
    });
    return elem;
  }


  function maskAssigned(elem, mask) {
    if (elem.tagName.toLowerCase() == 'img') {
      Monocle.Events.listenForTap(mask, function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var options = {
          scrollTo: 'center',
          from: [
            mask.stencilRect.left+p.container.offsetLeft,
            mask.stencilRect.top+p.container.offsetTop
          ]
        };
        var img = document.createElement('img');
        img.src = elem.src;
        window.monReader.billboard.show(img, options);
      });
      return true;
    }
    return false;
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
  // A weird but useful property
  // of <a> tags is that while link.getAttribute('href') will return the
  // actual string value of the attribute (eg, 'foo.html'), link.href will
  // return the absolute URL (eg, 'http://example.com/monocles/foo.html').
  //
  function deconstructHref(elem) {
    var url = elem.href;
    if (!elem.getAttribute('target')) {
      var m = url.match(/([^#]*)(#.*)?$/);
      var path = m[1];
      var anchor = m[2] || '';
      var cmpts = p.reader.getBook().properties.componentIds;
      for (var i = 0, ii = cmpts.length; i < ii; ++i) {
        if (path.substr(0 - cmpts[i].length) == cmpts[i]) {
          return { internal: cmpts[i] + anchor };
        }
      }
    }
    return { external: url };
  }


  API.createControlElements = createControlElements;
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
