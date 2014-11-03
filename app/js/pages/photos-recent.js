'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');
var _ = require('lodash');
var $ = Backbone.$;

module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Poze recente',

  initialize: function (options) {
    options = options || {};
    this.slug = options.slug || 'photos-recent';
    this.pageTitle = options.pageTitle || 'Orasul Memorabil | Poze recente';
    this.documentClasses = options.documentClasses || ['recent-photos'];
    this.template = options.template || templates.pages.photosRecent,
    this.filter = options.filter || {};
  },

  loadPhotos: function (count, after) {
    var self = this;

    // var apiUri =  'http://localhost:8080/api';
    var apiUri = '/api';
    var uri = apiUri + '/recent_photos?count=' + count;
    if (after !== undefined) {
      uri = uri + '&after=' + after;
    }
    if (self.filter.decade) {
      uri = uri + '&decade=' + self.filter.decade;
    }
    if (self.filter.folder) {
      uri = uri + '&folder=' + self.filter.folder;
    }
    if (self.filter.album) {
      uri = uri + '&album=' + self.filter.album;
    }

    var xhr = $.ajax({
      url: uri,
      method: 'GET',
      dataType: 'json',
    });

    self.$('#photo-loading').css('display', 'block');

    self.ongoingRequest = xhr;

    xhr.done(function (data) {
      if (data.length) {
        self.lastId = data[data.length - 1]._id;
      }
      if (data.length < count) {
        self.reachedEnd = true;
      }
      for (var i = 0, n = data.length; i < n; i++) {
        self.photoContainer.append(templates.photoPreview(data[i]));
      }
    });

    xhr.always(function () {
      self.ongoingRequest = null;
      self.$('#photo-loading').css('display', 'none');
    });
  },

  render: function () {
    var self = this;
    self.$el.html(self.template());
    if (self.ongoingRequest) {
      self.ongoingRequest.cancel();
      self.ongoingRequest = null;
    }
    self.reachedEnd = false;
    self.lastId = null;
    self.photoContainer = self.$('#photo-container');
    self.loadPhotos(15);
    if (!self.boundEvents) {
      self.boundEvents = true;
      self.loadMoreHandler = _.throttle(function () {
        var $body = $('body');
        if ($body.height() - ($(window).height() + $body[0].scrollTop) < 500) {
          self.loadMorePhotos();
        }
      }, 500);
      $(window).on('scroll', self.loadMoreHandler);
    }
    return self;
  },

  stopListening: function () {
    var self = this;
    if (self.boundEvents) {
      $(window).off('scroll', self.loadMoreHandler);
    }
    self.constructor.__super__.stopListening.apply(this, arguments);
  },

  loadMorePhotos: function () {
    var self = this;
    if (!self.ongoingRequest && !self.reachedEnd) {
      self.loadPhotos(15, self.lastId);
    }
  },

  customDocumentClasses: function () {
    return this.documentClasses;
  },
});
