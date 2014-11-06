'use strict';

var Router = require('ampersand-router');
var _ = require('lodash');
var routes = require('./lib/routes.json');

var HomePage = require('./pages/home');
var DespreProiectPage = require('./pages/despre-proiect');
var PhotosSidebarPage = require('./pages/photos-sidebar');
var PhotosRecentPage = require('./pages/photos-recent');
var PhotosTimeline = require('./pages/timeline');
var PhotoPage = require ('./pages/photo');

var om = 'Orasul Memorabil | ';

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
    this.switchPage(new PhotosRecentPage({}));
  },

  photosYear: function (year) {
    this.switchPage(new PhotosSidebarPage({
      slug: 'photos-year',
      pageTitle: om + ((year === null) ? 
        'Decade' : 
        ('Poze Anii \'' + year.toString().substr(2))),
      filter: {
        decade: year,
      },
      sidebarApiResource: '/decades'
    }));
  },

  photosAlbum: function (album) {
    this.switchPage(new PhotosSidebarPage({
      slug: 'photos-album',
      pageTitle: om + ((album === null) ? 
        'Albume' :
        ('Albumul ' + album)),
      filter: {
        album: album,
      },
      sidebarApiResource: '/albums'
    }));
  },

  photosFolder: function (folder) {
    this.switchPage(new PhotosSidebarPage({
      slug: 'photos-folder',
      pageTitle: om + ((folder === null) ?
        'Colecții' :
        ('Colecția ' + folder)),
      filter: {
        folder: folder,
      },
      sidebarApiResource: '/folders'
    }));
  },

  photosTimeline: function () {
    this.switchPage(new PhotosTimeline({}));
  },

  photo: function (id) {
    this.switchPage(new PhotoPage({
      photoId: id 
    }));
  }
});
