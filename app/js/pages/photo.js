'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');
var api = require('../lib/api');

module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Imagine',
  slug: 'photo',
  template: templates.pages.photo,

  initialize: function (options) {
    var self = this;
    self.photoId = options.photoId|| {};

    api('/photo/' + self.photoId).then(function (data) {
      self.photo = data;
      document.title = 'Orasul Memorabil | ' + data.title;
      self.render();
    });
  },

  render: function () {
    var self = this;
    self.$el.html(self.template({
      id: this.photoId,
      photo: this.photo,
    }));
  },

  customDocumentClasses: function () {
    return ['photo'];
  },
});
