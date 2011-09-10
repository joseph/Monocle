Monocle.Factory = function (element, label, index, reader) {

  var API = { constructor: Monocle.Factory };
  var k = API.constants = API.constructor;
  var p = API.properties = {
    element: element,
    label: label,
    index: index,
    reader: reader,
    prefix: reader.properties.classPrefix || ''
  }


  // If index is null, uses the first available slot. If index is not null and
  // the slot is not free, throws an error.
  //
  function initialize() {
    if (!p.label) { return; }
    // Append the element to the reader's graph of DOM elements.
    var node = p.reader.properties.graph;
    node[p.label] = node[p.label] || [];
    if (typeof p.index == 'undefined' && node[p.label][p.index]) {
      throw('Element already exists in graph: '+p.label+'['+p.index+']');
    } else {
      p.index = p.index || node[p.label].length;
    }
    node[p.label][p.index] = p.element;

    // Add the label as a class name.
    addClass(p.label);
  }


  // Finds an element that has been created in the context of the current
  // reader, with the given label. If oIndex is not provided, returns first.
  // If oIndex is provided (eg, n), returns the nth element with the label.
  //
  function find(oLabel, oIndex) {
    if (!p.reader.properties.graph[oLabel]) {
      return null;
    }
    return p.reader.properties.graph[oLabel][oIndex || 0];
  }


  // Takes an elements and assimilates it into the reader -- essentially
  // giving it a "dom" object of it's own. It will then be accessible via find.
  //
  // Note that (as per comments for initialize), if oIndex is provided and
  // there is no free slot in the array for this label at that index, an
  // error will be thrown.
  //
  function claim(oElement, oLabel, oIndex) {
    return oElement.dom = new Monocle.Factory(
      oElement,
      oLabel,
      oIndex,
      p.reader
    );
  }


  // Create an element with the given label.
  //
  // The last argument (whether third or fourth) is the options hash. Your
  // options are:
  //
  //   class - the classname for the element. Must only be one name.
  //   html - the innerHTML for the element.
  //   text - the innerText for the element (an alternative to html, simpler).
  //
  // Returns the created element.
  //
  function make(tagName, oLabel, index_or_options, or_options) {
    var oIndex, options;
    if (arguments.length == 1) {
      oLabel = null,
      oIndex = 0;
      options = {};
    } else if (arguments.length == 2) {
      oIndex = 0;
      options = {};
    } else if (arguments.length == 4) {
      oIndex = arguments[2];
      options = arguments[3];
    } else if (arguments.length == 3) {
      var lastArg = arguments[arguments.length - 1];
      if (typeof lastArg == "number") {
        oIndex = lastArg;
        options = {};
      } else {
        oIndex = 0;
        options = lastArg;
      }
    }

    var oElement = document.createElement(tagName);
    claim(oElement, oLabel, oIndex);
    if (options['class']) {
      oElement.className += " "+p.prefix+options['class'];
    }
    if (options['html']) {
      oElement.innerHTML = options['html'];
    }
    if (options['text']) {
      oElement.appendChild(document.createTextNode(options['text']));
    }

    return oElement;
  }


  // Creates an element by passing all the given arguments to make. Then
  // appends the element as a child of the current element.
  //
  function append(tagName, oLabel, index_or_options, or_options) {
    var oElement = make.apply(this, arguments);
    p.element.appendChild(oElement);
    return oElement;
  }


  // Returns an array of [label, index, reader] for the given element.
  // A simple way to introspect the arguments required for #find, for eg.
  //
  function address() {
    return [p.label, p.index, p.reader];
  }


  // Apply a set of style rules (hash or string) to the current element.
  // See Monocle.Styles.applyRules for more info.
  //
  function setStyles(rules) {
    return Monocle.Styles.applyRules(p.element, rules);
  }


  function setBetaStyle(property, value) {
    return Monocle.Styles.affix(p.element, property, value);
  }


  // ClassName manipulation functions - with thanks to prototype.js!

  // Returns true if one of the current element's classnames matches name --
  // classPrefix aware (so don't concate the prefix onto it).
  //
  function hasClass(name) {
    name = p.prefix + name;
    var klass = p.element.className;
    if (!klass) { return false; }
    if (klass == name) { return true; }
    return new RegExp("(^|\\s)"+name+"(\\s|$)").test(klass);
  }


  // Adds name to the classnames of the current element (prepending the
  // reader's classPrefix first).
  //
  function addClass(name) {
    if (hasClass(name)) { return; }
    var gap = p.element.className ? ' ' : '';
    return p.element.className += gap+p.prefix+name;
  }


  // Removes (classPrefix+)name from the classnames of the current element.
  //
  function removeClass(name) {
    var reName = new RegExp("(^|\\s+)"+p.prefix+name+"(\\s+|$)");
    var reTrim = /^\s+|\s+$/g;
    var klass = p.element.className;
    p.element.className = klass.replace(reName, ' ').replace(reTrim, '');
    return p.element.className;
  }


  API.find = find;
  API.claim = claim;
  API.make = make;
  API.append = append;
  API.address = address;

  API.setStyles = setStyles;
  API.setBetaStyle = setBetaStyle;
  API.hasClass = hasClass;
  API.addClass = addClass;
  API.removeClass = removeClass;

  initialize();

  return API;
}

Monocle.pieceLoaded('core/factory');
