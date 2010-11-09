(function () {
  var bookData = {
    getComponents: function () {
      return ['content/0.html', 'content/1/1.html', 'content/2/2.html'];
    },
    getComponent: function (cmptId) {
      return { url: cmptId }
    },
    getContents: function () {
      return [
        {
          title: "0",
          src: "content/0.html"
        },
        {
          title: "1",
          src: "content/1/1.html"
        },
        {
          title: "2",
          src: "content/2/2.html#heading"
        },
        {
          title: "3 (does not exist)",
          src: "content/3/3.html"
        }
      ];
    },
    getMetaData: function(key) {
      return { title: "Lorem Ipsum", creator: "Mr Monocle" }[key];
    }
  }

  // Initialize the reader element.
  var rdrOptions = {
    panels: Monocle.Panels.IMode,
    flipper: Monocle.Flippers.Instant
  }
  Monocle.Events.listen(
    window,
    'load',
    function () {
      mutateLinksWhenComponentLoaded(document.getElementById('reader'));
      Monocle.Reader('reader', bookData, rdrOptions, function (rdr) {
        window.reader = rdr;
        alertIfComponentNotFound(rdr);
        createToC(rdr);
      });
    }
  );


  function alertIfComponentNotFound(rdr) {
    rdr.listen('monocle:notfound', function () { alert('Not found.') });
  }


  function createToC(rdr) {
    var toc = Monocle.Controls.Contents(rdr);
    rdr.addControl(toc, 'popover', { hidden: true });
    tapMiddlePanelToInvokeToC(rdr, toc);
  }


  function tapMiddlePanelToInvokeToC(rdr, toc) {
    var panels = rdr.properties.flipper.properties.panels;
    var pData = {};
    panels.menuCallbacks({
      start: function (panel, x, y) {
        pData.contact = (new Date()).getTime();
        pData.timeout = setTimeout(function () {
          pData = {};
          panels.modeOn();
        }, 600);
      },
      end: function (panel, x, y) {
        if (pData.contact) {
          clearTimeout(pData.timeout);
          rdr.showControl(toc);
        }
        pData = {};
      }
    });
  }


  function mutateLinksWhenComponentLoaded(rdr) {
    Monocle.Events.listen(
      rdr,
      'monocle:componentchange',
      function (evt) { mutateLinks(evt.m['document'], evt.m['component']); }
    );
  }


  var protocolAndHostRegex = /^[^\/]*:\/\/[^\/]+/;

  function mutateLinks(doc, component) {
    var links = doc.getElementsByTagName('a');
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      var href = link.getAttribute('href');
      if (!href) {
        continue;
      }
      if (href.match(protocolAndHostRegex)) {
        // Open external links in a new window.
        link.setAttribute("target", "_blank");
      } else {
        if (href.match(/^#/)) {
          link.href = component.properties.id + href;
        }
        console.log("Setting up a link: " + link.href);
        Monocle.Events.listen(link, 'click', moveToChapter);
      }
    }
  }


  function moveToChapter(evt) {
    var link = evt.currentTarget;
    var cmptId = hrefToCmptId(link.href);
    console.log('Skipping to chapter: ' + cmptId);
    window.reader.skipToChapter(cmptId);
    evt.preventDefault();
  }


  function hrefToCmptId(href) {
    href = href.replace(protocolAndHostRegex, '');
    href = href.replace(/^\/test\/links\//, '');
    return href;
  }

})();
