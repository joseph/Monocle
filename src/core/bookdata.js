// A shortcut for creating a bookdata object from a 'data' hash.
//
// eg:
//
//   Monocle.bookData({ components: ['intro.html', 'ch1.html', 'ch2.html'] });
//
// All keys in the 'data' hash are optional:
//
//   components: must be an array of component urls
//   chapters: must be an array of nested chapters (the usual bookdata structure)
//   metadata: must be a hash of key/values
//   getComponentFn: override the default way to fetch components via id
//
Monocle.bookData = function (data) {
  return {
    getComponents: function () {
      return data.components || ['anonymous'];
    },
    getContents: function () {
      return data.chapters || [];
    },
    getComponent: data.getComponent || function (id) {
      return { url: id }
    },
    getMetaData: function (key) {
      return (data.metadata || {})[key];
    },
    data: data
  }
}


// A shortcut for creating a bookdata object from an array of element ids.
//
// eg:
//
//   Monocle.bookDataFromIds(['part1', 'part2']);
//
Monocle.bookDataFromIds = function (elementIds) {
  return Monocle.bookData({
    components: elementIds,
    getComponent: function (cmptId) {
      return { nodes: [document.getElementById(cmptId)] }
    }
  });
}


// A shortcut for creating a bookdata object from an array of nodes.
//
// eg:
//
//   Monocle.bookDataFromNodes([document.getElementById('content')]);
//
Monocle.bookDataFromNodes = function (nodes) {
  return Monocle.bookData({
    getComponent: function (n) { return { 'nodes': nodes }; }
  });
}
