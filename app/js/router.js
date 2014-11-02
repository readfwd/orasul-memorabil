'use strict';

var Router = require('ampersand-router');
var $ = require('./shims/jquery');
var _ = require('lodash');
var routes = require('./lib/routes.json');

var HomePage = require('./pages/home');
var DespreProiectPage = require('./pages/despre-proiect');

module.exports = Router.extend({
  routes: _.mapValues(routes, function(route) {
    return route.prefix;
  }),

  home: function () {
    this.trigger('newPage', new HomePage({}));
    $('body').attr('data-page', 'home');
    console.log('home');

  },
  despreProiect: function () {
    this.trigger('newPage', new DespreProiectPage({}));
    $('body').attr('data-page', 'despre-proiect');
    console.log('despre-proiect');
  }
});
