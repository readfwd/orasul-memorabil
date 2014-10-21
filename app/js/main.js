'use strict';

var $ = require('./shims/jquery');
var _ = require('lodash');

var MainView = require('./views/main');
var Router = require('./router');

var loadcss = require('./lib/loadcss');

module.exports = {
  launch: _.once(function () {
    var self = window.app = this;

    self.router = new Router();

    // Wait for the DOM to be rendered
    $(document).ready(function () {
      loadcss('/css/main.css');
      loadcss('http://fonts.googleapis.com/css?family=Unica+One|Roboto:400,300,100|Roboto+Slab:400,300');

      //Mainview initialization
      var mainView = self.view = new MainView({
        el: document.body
      });

      //Render the main view
      mainView.render();

      //Listen for the 'newPage' event
      self.router.on('newPage', mainView.setPage, mainView);

      //Verify if the evironment is localhost or live.
      var isLocal = false;
      if (window.location.host.indexOf('localhost') !== -1) {
        // Use PushState for dev and browser-sync
        isLocal = true;
      }
      var usePushState = !isLocal;

      self.router.history.start({
        root: '/',
        pushState: usePushState
      });
    });
  }),

  navigate: function (page) {
    var url = (page.charAt(0) === '/') ? page.slice(1) : page;
    this.router.history.navigate(url, { trigger: true});
  }
};

module.exports.launch();
