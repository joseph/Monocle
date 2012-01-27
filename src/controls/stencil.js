Monocle.Controls.Stencil = function (reader) {

  if (Monocle.Controls == this) { return new this.Stencil(reader); }

  var API = { constructor: Monocle.Controls.Stencil }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    reader: reader,
    activeComponent: null,
    components: {},
    cutouts: []
  }


  // Create the stencil container and listen for draw/update events.
  //
  function createControlElements(holder) {
    p.container = holder.dom.make('div', k.CLS.container);
    p.reader.listen('monocle:turn', update);
    p.reader.listen('monocle:stylesheetchange', update);
    p.reader.listen('monocle:resize', update);
    p.reader.listen('monocle:interactive:on', disable);
    p.reader.listen('monocle:interactive:off', enable);
    p.baseURL = getBaseURL();
    update();
    return p.container;
  }


  // Resets any pre-calculated rectangles for the active component,
  // recalculates them, and forces cutouts to be "drawn" (moved into the new
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
  // cutout links to sit above any currently visible rectangles.
  //
  function draw() {
    var pageDiv = p.reader.visiblePages()[0];
    var cmptId = pageComponentId(pageDiv);
    if (!p.components[cmptId]) {
      return;
    }

    // Position the container.
    alignToComponent(pageDiv);

    // Layout the cutouts.
    var placed = 0;
    if (!p.disabled) {
      var rects = p.components[cmptId];
      if (rects && rects.length) {
        placed = layoutRectangles(pageDiv, rects);
      }
    }

    // Hide remaining rects.
    while (placed < p.cutouts.length) {
      hideCutout(placed);
      placed += 1;
    }
  }


  // Iterate over all the <a> elements in the active component, and
  // create an array of rectangular points corresponding to their positions.
  //
  function calculateRectangles(pageDiv) {
    var cmptId = pageComponentId(pageDiv);
    p.activeComponent = cmptId;
    var doc = pageDiv.m.activeFrame.contentDocument;
    var offset = getOffset(pageDiv);
    // BROWSERHACK: Gecko doesn't subtract translations from GBCR values.
    if (Monocle.Browser.is.Gecko) {
      offset.l = 0;
    }
    var calcRects = false;
    if (!p.components[cmptId]) {
      p.components[cmptId] = []
      calcRects = true;
    }

    var links = doc.getElementsByTagName('a');
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      if (link.href) {
        var hrefObject = deconstructHref(link.href);
        link.setAttribute('target', '_blank');
        link.deconstructedHref = hrefObject;
        if (hrefObject.external) {
          link.href = hrefObject.external;
        } else if (link.relatedLink) {
          link.removeAttribute('href');
        }

        if (calcRects && link.getClientRects) {
          var r = link.getClientRects();
          for (var j = 0; j < r.length; j++) {
            p.components[cmptId].push({
              link: link,
              href: hrefObject,
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


  // Find the offset position in pixels from the left of the current page.
  //
  function getOffset(pageDiv) {
    return {
      l: pageDiv.m.offset || 0,
      w: pageDiv.m.dimensions.properties.width
    };
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
      if (!p.cutouts[i]) {
        p.cutouts[i] = createCutout();
      }
      var cutout = p.cutouts[i];
      cutout.dom.setStyles({
        display: 'block',
        left: (visRects[i].left - offset.l)+"px",
        top: visRects[i].top+"px",
        width: visRects[i].width+"px",
        height: visRects[i].height+"px"
      });
      cutout.relatedLink = visRects[i].link;
      var extURL = visRects[i].href.external;
      if (extURL) {
        cutout.setAttribute('href', extURL);
      } else {
        cutout.removeAttribute('href');
      }
    }

    return i;
  }


  function createCutout() {
    var cutout =  p.container.dom.append('a', k.CLS.cutout);
    cutout.setAttribute('target', '_blank');
    Monocle.Events.listen(cutout, 'click', cutoutClick);
    return cutout;
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
      top: cmpt.offsetTop + "px",
      left: cmpt.offsetLeft + "px"
    });
  }


  function hideCutout(index) {
    p.cutouts[index].dom.setStyles({ display: 'none' });
  }


  function rectVisible(rect, l, r) {
    return rect.left >= l && rect.left < r;
  }


  // Make the active cutouts visible (by giving them a class -- override style
  // in monocle.css).
  //
  function toggleHighlights() {
    var cls = k.CLS.highlights
    if (p.container.dom.hasClass(cls)) {
      p.container.dom.removeClass(cls);
    } else {
      p.container.dom.addClass(cls);
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
  // - a 'componentId' property -- a relative URL with no forward slash,
  // which must be treated as a componentId; and
  // - a 'hash' property -- which may be an anchor in the form "#foo", or
  // may be blank.
  //
  // Expects an absolute URL to be passed in. A weird but useful property
  // of <a> tags is that while link.getAttribute('href') will return the
  // actual string value of the attribute (eg, 'foo.html'), link.href will
  // return the absolute URL (eg, 'http://example.com/monocles/foo.html').
  //
  function deconstructHref(url) {
    var result = {};
    var re = new RegExp("^"+p.baseURL+"([^#]*)(#.*)?$");
    var match = url.match(re);
    if (match) {
      result.componentId = match[1] || pageComponentId();
      result.hash = match[2] || '';
    } else {
      result.external = url;
    }
    return result;
  }


  // Returns the base URL for the reader's host page, which can be used
  // to deconstruct the hrefs of individual links within components.
  //
  function getBaseURL() {
    var a = document.createElement('a');
    a.setAttribute('href', 'x');
    return a.href.replace(/x$/,'')
  }


  // Invoked when a cutout is clicked -- opens external URL in new window,
  // or moves to an internal component.
  //
  function cutoutClick(evt) {
    var cutout = evt.currentTarget;
    if (cutout.getAttribute('href')) { return; }
    var olink = cutout.relatedLink;
    Monocle.Events.listen(olink, 'click', clickHandler);
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
    try {
      olink.dispatchEvent(mimicEvt);
    } finally {
      Monocle.Events.deafen(olink, 'click', clickHandler);
    }
  }


  function clickHandler(evt) {
    if (evt.defaultPrevented) { // NB: unfortunately not supported in Gecko.
      return;
    }
    var link = evt.currentTarget;
    var hrefObject = link.deconstructedHref;
    if (!hrefObject) {
      return;
    }
    if (hrefObject.external) {
      return;
    }
    var cmptId = hrefObject.componentId + hrefObject.hash;
    p.reader.skipToChapter(cmptId);
    evt.preventDefault();
  }


  function disable() {
    p.disabled = true;
    draw();
  }


  function enable() {
    p.disabled = false;
    draw();
  }


  API.createControlElements = createControlElements;
  API.draw = draw;
  API.update = update;
  API.toggleHighlights = toggleHighlights;

  return API;
}


Monocle.Controls.Stencil.CLS = {
  container: 'controls_stencil_container',
  cutout: 'controls_stencil_cutout',
  highlights: 'controls_stencil_highlighted'
}


Monocle.pieceLoaded('controls/stencil');
