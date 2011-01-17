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


  function createControlElements(holder) {
    p.container = holder.dom.make('div', k.CLS.container);
    p.reader.listen('monocle:turn', draw);
    p.reader.listen('monocle:stylesheetchange', update);
    p.reader.listen('monocle:resize', update);
    return p.container;
  }


  function update() {
    var pageDiv = p.reader.visiblePages()[0];
    var cmptId = pageComponentId(pageDiv);
    p.components[cmptId] = null; // Reset pre-calculated rectangles.
    getRects(pageDiv);
    draw();
  }


  // After a page turn, aligns cutouts to pages. If component changed or
  // resized, calls update.
  function draw() {
    var pageDiv = p.reader.visiblePages()[0];
    var cmptId = pageComponentId(pageDiv);
    if (cmptId != p.activeComponent) {
      getRects(pageDiv);
    }

    // Position the container.
    alignToComponent(pageDiv);

    // Layout the cutouts.
    var placed = 0;
    var rects = p.components[cmptId];
    if (rects && rects.length) {
      placed = layoutRects(pageDiv, rects);
    }

    // Hide remaining rects.
    while (placed < p.cutouts.length) {
      hideCutout(placed);
      placed += 1;
    }
  }


  function getRects(pageDiv) {
    var cmptId = pageComponentId(pageDiv);
    p.activeComponent = cmptId;
    var doc = pageDiv.m.activeFrame.contentDocument;
    var offset = getOffset(pageDiv);
    var calcRects = false;
    if (!p.components[cmptId]) {
      p.components[cmptId] = []
      calcRects = true;
    }

    var iElems = doc.getElementsByTagName('a');
    for (var i = 0; i < iElems.length; ++i) {
      var href = iElems[i].getAttribute('href');
      if (href) {
        if (!iElems[i].processed) {
          fixLink(iElems[i], href);
        }

        if (calcRects) {
          var r = iElems[i].getClientRects();
          for (var j = 0; j < r.length; j++) {
            p.components[cmptId].push({
              href: href,
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


  function getOffset(pageDiv) {
    var place = p.reader.getPlace();
    var pages = place.pageNumber() - 1;
    var result = { w: pageDiv.m.dimensions.properties.measurements.width }
    result.l = result.w * pages;
    return result;
  }


  // Creates the necessary cutouts for the active component on the given page,
  // or updates them if they already exist.
  function layoutRects(pageDiv, rects) {
    var offset = getOffset(pageDiv);
    var visRects = [];
    for (var i = 0; i < rects.length; ++i) {
      if (rectVisible(rects[i], offset.l, offset.l + offset.w)) {
        visRects.push(rects[i]);
      }
    }

    // Update location of visible rectangles - creating as required.
    for (i = 0; i < visRects.length; ++i) {
      if (!p.cutouts[i]) {
        p.cutouts[i] = createCutout();
      }
      var link = p.cutouts[i];
      link.dom.setStyles({
        display: 'block',
        left: (visRects[i].left - offset.l)+"px",
        top: visRects[i].top+"px",
        width: visRects[i].width+"px",
        height: visRects[i].height+"px"
      });
      fixLink(link, visRects[i].href);
    }

    return i;
  }


  function fixLink(link, href) {
    Monocle.Events.deafen(link, 'click', cutoutClick);
    link.href = href;
    link.setAttribute('target', '_blank');
    if (!k.REGEXES.protocolAndHost.test(href)) {
      if (k.REGEXES.onlyAnchorInHref.test(href)) {
        var pageDiv = p.reader.visiblePages()[0];
        var cmptId = pageComponentId(pageDiv);
        link.href = cmptId + href;
      }
      Monocle.Events.listen(link, 'click', cutoutClick);
    }
    link.processed = true;
  }


  function createCutout() {
    var cutout =  p.container.dom.append('a', k.CLS.cutout);
    return cutout;
  }


  function pageComponentId(pageDiv) {
    return pageDiv.m.activeFrame.m.component.properties.id;
  }


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


  function cutoutClick(evt) {
    var link = evt.currentTarget;
    var cmptId = hrefToCmptId(link.href);
    p.reader.skipToChapter(cmptId);
    evt.preventDefault();
  }


  function hrefToCmptId(href) {
    return href.replace(k.REGEXES.protocolAndHost, '').replace(/^\//, '');
  }


  API.createControlElements = createControlElements;
  API.draw = draw;
  API.update = update;

  return API;
}


Monocle.Controls.Stencil.CLS = {
  container: 'controls_stencil_container',
  cutout: 'controls_stencil_cutout'
}


Monocle.Controls.Stencil.REGEXES = {
  protocolAndHost: /^[^\/]*:\/\/[^\/]+/,
  onlyAnchorInHref: /^#(.*)$/
}

Monocle.pieceLoaded('controls/stencil');
