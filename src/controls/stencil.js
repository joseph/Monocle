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


  function initialize() {
  }


  function createControlElements(holder) {
    p.container = holder.dom.make('div', k.CLS.container);
    p.reader.listen('monocle:turn', shift);
    p.container.dom.setStyles({
      top: "15px",
      left: "15px"
    });
    return p.container;
  }


  // After a page turn, aligns cutouts to pages. If component changed or
  // resized, calls update.
  function shift(evt) {
    var pageDiv = p.reader.visiblePages()[0];
    var cmptId = pageComponentId(pageDiv);
    if (cmptId != p.activeComponent) {
      update(pageDiv);
    }
    var place = p.reader.getPlace();
    var dims = pageDiv.m.dimensions.properties.measurements;
    Monocle.Styles.setX(p.container, (place.pageNumber() - 1) * dims.width * -1);
  }


  // Creates the necessary cutouts for the active component on the given page,
  // or updates them if they already exist.
  function update(pageDiv) {
    var cmptId = pageComponentId(pageDiv);
    p.activeComponent = cmptId;
    var doc = pageDiv.m.activeFrame.contentDocument;
    var rects = p.components[cmptId];
    if (!rects) {
      var rects = p.components[cmptId] = [];
      var iElems = doc.getElementsByTagName('A');
      for (var i = 0; i < iElems.length; ++i) {
        var r = iElems[i].getClientRects();
        for (var j = 0; j < r.length; j++) {
          rects.push(r[j]);
        }
      }
    }

    if (!rects.length) { return; }

    // Update location of rects - creating as required.
    for (i = 0; i < rects.length; ++i) {
      if (!p.cutouts[i]) {
        p.cutouts[i] = p.container.dom.append('div', k.CLS.cutout);
      }
      var place = p.reader.getPlace();
      var pages = place.pageNumber() - 1;
      var l = rects[i].left;
      var t = rects[i].top;
      p.cutouts[i].dom.setStyles({
        display: 'block',
        left: l+"px",
        top: t+"px",
        width: rects[i].width+"px",
        height: rects[i].height+"px"
      });
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


  API.createControlElements = createControlElements;
  API.shift = shift;
  API.update = update;

  initialize();

  return API;
}


Monocle.Controls.Stencil.CLS = {
  container: 'controls_stencil_container',
  cutout: 'controls_stencil_cutout'
}

Monocle.pieceLoaded('controls/stencil');
