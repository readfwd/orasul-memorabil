'use strict';

var Router = require('ampersand-router');
var _ = require('lodash');
var routes = require('./lib/routes.json');

var HomePage = require('./pages/home');
var DespreProiectPage = require('./pages/despre-proiect');
var PhotosPage = require('./pages/photos-recent');
var PhotosTimeline = require('./pages/timeline');
var AlbumsPage = require('./pages/albums');
var CategoriesPage = require ('./pages/categories');
var PhotoViewPage = require ('./pages/photo-view');

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
    this.switchPage(new PhotosPage({
      slug: 'photos-year',
      pageTitle: 'Orasul Memorabil | Poze Anii \'' + year.toString().substr(2),
      filter: {
        decade: year,
      },
    }));
  },

  photosAlbum: function (album) {
    this.switchPage(new PhotosPage({
      slug: 'photos-album',
      pageTitle: 'Orasul Memorabil | Albumul ' + album,
      filter: {
        album: album,
      },
    }));
  },

  photosFolder: function (folder) {
    this.switchPage(new PhotosPage({
      slug: 'photos-folder',
      pageTitle: 'Orasul Memorabil | Colecția ' + folder,
      filter: {
        folder: folder,
      },
    }));
  },

  photosTimeline: function () {
    this.switchPage(new PhotosTimeline({}));
  },

  albume: function () {
    this.switchPage(new AlbumsPage({}));
  },

  categorii: function () {
    this.switchPage(new CategoriesPage({}));
  },

  photo: function (slug) {
    this.switchPage(new PhotoViewPage({
      slug: slug
    }));
  }
});
