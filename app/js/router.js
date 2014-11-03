'use strict';

var Router = require('ampersand-router');
var $ = require('./shims/jquery');
var _ = require('lodash');
var routes = require('./lib/routes.json');

var HomePage = require('./pages/home');
var DespreProiectPage = require('./pages/despre-proiect');
var PhotosPage = require('./pages/photos-recent');
var PhotosFiltered = require('./pages/photos');
var PhotosTimeline = require('./pages/timeline');

module.exports = Router.extend({
  routes: _.mapValues(routes, function(route) {
    return route.prefix;
  }),

  switchPage: function (pageView) {
    this.trigger('newPage', pageView);
  },

  home: function () {
    this.switchPage(new HomePage({}));
  },

  despreProiect: function () {
    this.switchPage(new DespreProiectPage({}));
  },

  photosRecent: function () {
    this.switchPage(new PhotosPage({}));
  },

  photosYear: function (year) {
    this.switchPage(new PhotosFiltered({
      slug: 'photos-year',
      filter: {
        decade: year,
      },
    }));
  },

  photosTimeline: function () {
    this.switchPage(new PhotosTimeline({}));
  }
});
