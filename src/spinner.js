Carlyle.Spinner = function (node) {
  this.stop = function () {
    node.removeChild(this.elem);
  }

  this.elem = document.createElement('div');
  this.elem.style.cssText = Carlyle.Spinner.Style;
  this.elem.style.backgroundImage = "url("+ Carlyle.Spinner.imgURI +")";
  node.appendChild(this.elem);
}


Carlyle.Spinner.Style = "position:absolute; width: 100%; height: 100%;" +
  "background-color: #FFF; background-repeat: no-repeat;" +
  "background-position: center center;"


Carlyle.Spinner.imgURI = "data:image/gif;base64," +
  "R0lGODlhEAAQAPIAAP%2F%2F%2FwAAAMLCwoKCggAAAAAAAAAAAAAAACH%2BGkNyZWF0ZW" +
  "Qgd2l0aCBhamF4bG9hZC5pbmZvACH5BAAKAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAA" +
  "EAAQAAADGwi6MjRiSenIm9hqPOvljAOBZGmeaKqubOu6CQAh%2BQQACgABACwAAAAAEAAQ" +
  "AAADHAi63A5ikCEek2TalftWmPZFU%2FWdaKqubOu%2BbwIAIfkEAAoAAgAsAAAAABAAEA" +
  "AAAxwIutz%2BUIlBhoiKkorB%2Fp3GYVN1dWiqrmzrvmkCACH5BAAKAAMALAAAAAAQABAA" +
  "AAMbCLrc%2FjDKycQgQ8xL8OzgBg6ThWlUqq5s604JACH5BAAKAAQALAAAAAAQABAAAAMb" +
  "CLrc%2FjDKSautYpAhpibbBI7eOEzZ1l1s6yoJACH5BAAKAAUALAAAAAAQABAAAAMaCLrc" +
  "%2FjDKSau9OOspBhnC5BHfRJ7iOXAe2CQAIfkEAAoABgAsAAAAABAAEAAAAxoIutz%2BMM" +
  "pJ6xSDDDEz0dMnduJwZZulrmzbJAAh%2BQQACgAHACwAAAAAEAAQAAADGwi63P4wRjHIEB" +
  "JUYjP%2F2dZJlIVlaKqubOuyCQAh%2BQQACgAIACwAAAAAEAAQAAADHAi63A5ikCEek2Ta" +
  "lftWmPZFU%2FWdaKqubOu%2BbwIAOwAAAAAAAAAAAA%3D%3D";
