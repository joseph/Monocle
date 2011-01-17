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
    p.reader.listen('monocle:turn', shift);
    //p.reader.listen('monocle:stylesheetchange', update);
    //p.reader.listen('monocle:resize', update);
    return p.container;
  }


  // After a page turn, aligns cutouts to pages. If component changed or
  // resized, calls update.
  function shift(evt) {
    var pageDiv = p.reader.visiblePages()[0];
    var cmptId = pageComponentId(pageDiv);
    cmpt = pageDiv.m.activeFrame.parentNode;
    p.container.dom.setStyles({
      top: cmpt.offsetTop + "px",
      left: cmpt.offsetLeft + "px"
    });
    //if (cmptId != p.activeComponent) {
      update(pageDiv);
    //}
  }


  // Creates the necessary cutouts for the active component on the given page,
  // or updates them if they already exist.
  function update(pageDiv) {
    var cmptId = pageComponentId(pageDiv);
    p.activeComponent = cmptId;
    var doc = pageDiv.m.activeFrame.contentDocument;
    var rects = p.components[cmptId];
    var i;
    var href;
    if (!rects) {
      var rects = p.components[cmptId] = [];
      var iElems = doc.getElementsByTagName('a');
      for (i = 0; i < iElems.length; ++i) {
        if (href = iElems[i].getAttribute('href')) {
          var r = iElems[i].getClientRects();
          for (var j = 0; j < r.length; j++) {
            r[j].href = href;
            rects.push(r[j]);
          }
        }
      }
    }

    if (rects.length) {
      var place = p.reader.getPlace();
      var pages = place.pageNumber() - 1;
      var w = pageDiv.m.dimensions.properties.measurements.width;
      var l = w * pages;
      var visRects = [];
      for (i = 0; i < rects.length; ++i) {
        if (rectVisible(rects[i], l, l+w)) {
          visRects.push(rects[i]);
        }
      }

      // Update location of visible rectangles - creating as required.
      for (i = 0; i < visRects.length; ++i) {
        if (!p.cutouts[i]) {
          p.cutouts[i] = p.container.dom.append('a', k.CLS.cutout);
          p.cutouts[i].setAttribute('target', '_blank');
        }
        var link = p.cutouts[i];
        link.dom.setStyles({
          display: 'block',
          left: (visRects[i].left - l)+"px",
          top: visRects[i].top+"px",
          width: visRects[i].width+"px",
          height: visRects[i].height+"px"
        });
        Monocle.Events.deafen(link, 'click', cutoutClick);
        href = link.href = visRects[i].href;
        if (!k.REGEXES.protocolAndHost.test(href)) {
          if (k.REGEXES.onlyAnchorInHref.test(href)) {
            link.href = place.componentId() + href;
          }
          Monocle.Events.listen(link, 'click', cutoutClick);
        }
      }
    } else {
      i = 0;
    }

    // Hide remaining rects.
    while (i < p.cutouts.length) {
      p.cutouts[i].dom.setStyles({ display: 'none' });
      i += 1;
    }
  }


  function pageComponentId(pageDiv) {
    return pageDiv.m.activeFrame.m.component.properties.id;
  }


  function rectVisible(rect, left, right) {
    return Math.ceil(rect.left) >= left && Math.floor(rect.left) < right;
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
  API.shift = shift;
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
