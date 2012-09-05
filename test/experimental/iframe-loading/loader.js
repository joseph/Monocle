var IframeLoader = {};


IframeLoader.get = function (path) {
  var ajReq = new XMLHttpRequest();
  ajReq.open("GET", path, false);
  ajReq.send(null);
  return ajReq.responseText;
}


IframeLoader.init = function () {
  IframeLoader.testIframeWindow();
  IframeLoader.url = 'cmpts/cmpt.html';
  IframeLoader.str = IframeLoader.get(IframeLoader.url);
  IframeLoader.frame = document.getElementById('loadFrame');
  IframeLoader.frame.onload = IframeLoader.doneLoad;
  IframeLoader.results = document.getElementById('loadResults')
  document.getElementById('loadGo').onclick = IframeLoader.doLoad;
  document.getElementById('loadReset').onclick = IframeLoader.doReset;
}


IframeLoader.setUpFrame = function () {
  IframeLoader.frame.onload = IframeLoader.doneLoad;
}


IframeLoader.doLoad = function () {
  var sel = document.getElementById('loadWith');
  IframeLoader.results.innerHTML += sel.value+': ';
  IframeLoader.tStart = (new Date()).getTime();
  IframeLoader['load_'+sel.value]();
}


IframeLoader.doneLoad = function () {
  var msecs = (new Date()).getTime() - IframeLoader.tStart;
  IframeLoader.results.innerHTML += (msecs / 1000.0)+"s";
  try {
    var b = IframeLoader.frame.contentDocument.body.innerHTML.length;
    IframeLoader.results.innerHTML += " - "+b+"b\n";
  } catch (e) {
    IframeLoader.results.innerHTML += " - INACCESSIBLE\n";
  }
}


IframeLoader.doReset = function () {
  IframeLoader.frame.onload = IframeLoader.setUpFrame;
  IframeLoader.frame.src = 'about:blank';
  IframeLoader.results.innerHTML += "-------\n";
}


IframeLoader.injectBaseURI = function (str) {
  var a = document.createElement('a');
  a.setAttribute('href', IframeLoader.url);
  var baseURI = a.href;
  var headStartTagPattern = new RegExp("(<head(\s[^>]*>)|>)", "im");
  return str.replace(headStartTagPattern, '$1<base href="'+baseURI+'" />');
}


/* LOADER FUNCTIONS */

IframeLoader.load_url = function () {
  IframeLoader.frame.src = IframeLoader.injectBaseURI(IframeLoader.url);
}


IframeLoader.load_jsurl = function () {
  var src = IframeLoader.injectBaseURI(IframeLoader.str);
  IframeLoader.frame.contentWindow['cmpt'] = src;
  IframeLoader.frame.src = 'javascript:window["cmpt"];';
}


IframeLoader.load_docWrite = function () {
  var src = IframeLoader.injectBaseURI(IframeLoader.str);
  var doc = IframeLoader.frame.contentWindow.document;
  doc.open('text/html', 'replace');
  doc.write(src);
  doc.close();
}


IframeLoader.load_escapedjsurl = function () {
  var src = IframeLoader.injectBaseURI(IframeLoader.str);
  src = src.replace(/\n/g, '\\n');
  src = src.replace(/\r/, '\\r');
  src = src.replace(/\'/g, '\\\'');
  IframeLoader.frame.src = "javascript:'"+src+"'";
}


IframeLoader.load_dataurienc = function () {
  var src = IframeLoader.injectBaseURI(IframeLoader.str);
  src = encodeURIComponent(src);
  IframeLoader.frame.src = 'data:text/html;charset=utf-8,'+src;
}


IframeLoader.load_iframedocument = function () {
  var srcDoc = document.getElementById('loadHiddenFrame').contentDocument;
  var doc = IframeLoader.frame.contentDocument;

  // Replicate the base element the current contentDocument for WebKit.

  var srcBase = srcDoc.querySelector('base');
  if (!srcBase) {
    var a = document.createElement('a');
    a.setAttribute('href', IframeLoader.url);
    var baseURI = a.href;

    srcBase = srcDoc.createElement('base');
    srcBase.setAttribute('href', baseURI);
    var srcHead = srcDoc.querySelector('head');
    srcHead.insertBefore(srcBase, srcHead.firstChild);
  }

  if (navigator.userAgent.match(/Apple\s?WebKit/)) {
    var head = doc.querySelector('head');
    if (!head) {
      try {
        head = doc.createElement('head');
        doc.body ? doc.insertBefore(head, doc.body) : doc.appendChild(head);
      } catch (e) {
        head = doc.body;
      }
    }
    head.appendChild(doc.importNode(srcBase, false));
  }

  // Import the document.
  doc.replaceChild(
    doc.importNode(srcDoc.documentElement, true),
    doc.documentElement
  );

  setTimeout(IframeLoader.doneLoad, 0);
}


/* A LITTLE BIT OF IFRAME BEHAVIOURAL TESTING */

IframeLoader.testIframeWindow = function () {
  var ifr = document.createElement('iframe');
  try {
    ifr.contentWindow.innerWidth;
  } catch(e) {
    console.log('Failed to access content window before adding to DOM.');
  }
  document.body.appendChild(ifr);
  try {
    ifr.contentWindow.innerWidth;
  } catch(e) {
    console.log('Failed to access content window before assigning src.');
  }
  ifr.src = 'about:blank';
  try {
    ifr.contentWindow.innerWidth;
  } catch(e) {
    console.log('Failed to access content window after assigning src.');
  }
  document.body.removeChild(ifr);
}


/* INIT */

window.onload = IframeLoader.init;
