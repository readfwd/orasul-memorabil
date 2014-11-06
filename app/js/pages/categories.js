'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');
var $ = Backbone.$;

module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Categorii',
  slug: 'categorii',
  template: templates.pages.categories,

  initialize: function () {
    var self = this;

    // var apiUri =  'http://localhost:8080/api/folders';
    var apiUri = '/api/folders';

    var xhr = $.ajax({
      url: apiUri,
      type:'get',
      dataType: 'json',
    });

    xhr.done(function (data) {
      self.categories = data;
      self.render();
    });

    xhr.fail(function () {
      console.log(arguments);
    });
  },

  render: function () {
    var self = this;
    if (self.categories) {
      self.$el.html(self.template({
        categories: self.categories
      }));
    }
    return self;
  },

  customDocumentClasses: function () {
    return ['albums-page'];
  },
});
