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


  function find(oLabel, oIndex) {
    if (!p.reader.properties.graph[oLabel]) {
      return null;
    }
    return p.reader.properties.graph[oLabel][oIndex || 0];
  }


  function claim(oElement, oLabel, oIndex) {
    return oElement.dom = new Monocle.Factory(
      oElement,
      oLabel,
      oIndex,
      p.reader
    );
  }


  function make(tagName, oLabel, index_or_options, or_options) {
    var oIndex, options;
    if (arguments.length == 2) {
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
      oElement.innerText = options['text'];
    }

    return oElement;
  }


  function append(tagName, oLabel, index_or_options, or_options) {
    var oElement = make.apply(this, arguments);
    p.element.appendChild(oElement);
    return oElement;
  }


  function address() {
    return [p.label, p.index, p.reader];
  }


  function setStyle(rules) {
    Monocle.Styles.applyRules(p.element, rules);
  }


  // With thanks to prototype.js!

  function hasClass(name) {
    name = p.prefix + name;
    var klass = p.element.className;
    if (!klass) { return false; }
    if (klass == name) { return true; }
    return new RegExp("(^|\\s)"+name+"(\\s|$)").test(klass);
  }


  function addClass(name) {
    if (hasClass(name)) { return; }
    var gap = p.element.className ? ' ' : '';
    return p.element.className += gap+p.prefix+name;
  }


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

  API.setStyle = setStyle;
  API.hasClass = hasClass;
  API.addClass = addClass;
  API.removeClass = removeClass;

  initialize();

  return API;
}

Monocle.pieceLoaded('factory');
