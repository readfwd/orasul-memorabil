'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');
var $ = Backbone.$;

module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Albume',
  slug: 'albume',
  template: templates.pages.albums,

  initialize: function () {
    var self = this;

    var apiUri =  'http://localhost:8080/api/albums';
    // var apiUri = '/api/albums';

    var xhr = $.ajax({
      url: apiUri,
      type:'get',
      dataType: 'json',
    });

    xhr.done(function (data) {
      self.albums = data;
      self.render();
    });

    xhr.fail(function () {
      console.log(arguments);
    });
  },

  render: function () {
    var self = this;
    if (self.albums) {
      self.$el.html(self.template({
        albums: self.albums
      }));
    }
    return self;
  },

  customDocumentClasses: function () {
    return ['albums-page'];
  },
});
