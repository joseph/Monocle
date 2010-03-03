Monocle.Controls.Spinner = function (reader) {
  if (Monocle.Controls == this) {
    return new Monocle.Controls.Spinner(reader);
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
    divs: []
  }

  var API = {
    constructor: Monocle.Controls.Spinner,
    constants: k,
    properties: p
  }


  function initialize() {
    p.reader = reader;
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
  function listenForUsualDelays() {
    p.reader.addListener('monocle:bookchanging', spin);
    p.reader.addListener('monocle:bookchange', spun);
    p.reader.addListener('monocle:resizing', spin);
    p.reader.addListener('monocle:resize', spun);
  }


  function spin() {
    p.reader.showControl(API);
  }


  function spun() {
    p.reader.hideControl(API);
  }

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
