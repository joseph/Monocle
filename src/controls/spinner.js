Monocle.Controls.Spinner = function () {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Spinner();
  }

  var k = {
    imgURI: "data:image/gif;base64,R0lGODlhGAAYALMAAAAAAJmZmUpKStra2jo6OjM" +
      "zM319fczMzLa2tuvr61FRUSMjI42NjV5eXkJCQv%2F%2F%2FyH5BAEHAA8ALAAAAAAY" +
      "ABgAAAS%2F8MlJq73zGEVKIQozYNRgdF6aGgmJOF54SAMjeM5sHZ2AYIGebjJQFBStz" +
      "PAxaBQcSYlTMKIAAJVBx0D0%2FCpXC8JTNRQEl7DlxpDcAmmsxayQkOOXw9NewFyXEg" +
      "kefBgLAAtRgR8SHYASB1cEiWMOEkZtFwFXDRR0EgxHJAxXmAlsNB1fFwoAnA8BT1UPZ" +
      "lAYCQcjPAWYNDBUJA8HN0gVugJwmTA5eUZnBjoaMEeORCcqKgQMiRg1HB4g2sDiwBEA" +
      "Ow%3D%3D"
  }

  var p = {
    divs: [],
    spinCount: 0
  }

  var API = {
    constructor: Monocle.Controls.Spinner,
    constants: k,
    properties: p
  }


  function initialize() {
  }


  function assignToReader(reader) {
    p.reader = reader;
    if (p.spinCount > 0) {
      p.spinCount -= 1;
      spin();
    }
  }


  function createControlElements() {
    var anim = document.createElement('div');
    anim.style.cssText = Monocle.Styles.ruleText(
      Monocle.Styles.Controls.Spinner.anim
    );
    anim.style.backgroundImage = "url(" + k.imgURI + ")";
    p.divs.push(anim);
    return anim;
  }


  // Registers spin/spun event handlers for: loading, bookchanging, resizing.
  function listenForUsualDelays(listenToElement) {
    if (!listenToElement) {
      if (p.reader) {
        listenToElement = p.reader.properties.divs.box;
      } else {
        throw("No listenToElement or assigned reader.");
      }
    }
    Monocle.addListener(listenToElement, 'monocle:bookchanging', spin);
    Monocle.addListener(listenToElement, 'monocle:bookchange', spun);
    Monocle.addListener(listenToElement, 'monocle:componentloading', spin);
    Monocle.addListener(listenToElement, 'monocle:componentloaded', spun);
    Monocle.addListener(listenToElement, 'monocle:componentchanging', spin);
    Monocle.addListener(listenToElement, 'monocle:componentchange', spun);
    Monocle.addListener(listenToElement, 'monocle:resizing', spin);
    Monocle.addListener(listenToElement, 'monocle:resize', spun);
  }


  function spin(evt) {
    console.log('Spinning on ' + (evt ? evt.type : 'unknown'));
    p.spinCount += 1;
    if (!p.reader) {
      return;
    }
    p.reader.showControl(API);
    var pNode = evt && evt.monocleData.page ? evt.monocleData.page : null;
    for (var i = 0; i < p.divs.length; ++i) {
      p.divs[i].style.display =
        (!pNode || pNode == p.divs[i].parentNode.parentNode) ? 'block' : 'none'
    }
  }


  function spun(evt) {
    console.log('Spun on ' + (evt ? evt.type : 'unknown'));
    p.spinCount -= 1;
    if (p.spinCount > 0 || !p.reader) {
      return;
    }
    p.reader.hideControl(API);
  }

  API.assignToReader = assignToReader;
  API.createControlElements = createControlElements;
  API.listenForUsualDelays = listenForUsualDelays;
  API.spin = spin;
  API.spun = spun;

  initialize();

  return API;
}



Monocle.Styles.Controls.Spinner = {
  anim: {
    "position": "absolute",
    "width": "100%",
    "height": "100%",
    "background-color": "#FFF",
    "background-repeat": "no-repeat",
    "background-position": "center center"
  }
}


Monocle.pieceLoaded('controls/spinner');
