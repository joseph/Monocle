Carlyle = {};

//= require <reader>
//= require <book>
//= require <place>
//= require <component>
//= require <styles>
//= require <spinner>

Carlyle.Controls = {};

// A little console stub if not initialized in a console-equipped browser.
if (typeof window.console == "undefined") {
  window.console = {
    messages: [],
    log: function (msg) {
      this.messages.push(msg);
    }
  }
}
