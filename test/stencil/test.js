Monocle.DEBUG = true;

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

  var rdrOptions = {
    panels: Monocle.Panels.IMode
  }

  // Initialize the reader element.
  Monocle.Events.listen(
    window,
    'load',
    function () {
      Monocle.Reader('reader', bookData, rdrOptions, function (rdr) {
        window.reader = rdr;
        alertIfComponentNotFound(rdr);
        createStencil(rdr);
      });
    }
  );


  function alertIfComponentNotFound(rdr) {
    rdr.listen('monocle:notfound', function () { alert('Not found.') });
  }


  function createStencil(rdr) {
    var stencil = new Monocle.Controls.Stencil(rdr);
    rdr.addControl(stencil);
    // This line is useful mostly for testing:
    // it highlights the stencil's link cutouts.
    stencil.toggleHighlights();
  }

})();
