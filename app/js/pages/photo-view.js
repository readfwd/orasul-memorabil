'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');


module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Imagine',
  slug: 'despre-proiect',
  template: templates.pages.photoView,

  initialize: function (options) {
    this.slug = options.slug || {};
  },

  render: function () {
    console.log(this.slug);
    var self = this;
    self.$el.html(self.template({
      slug: this.slug
    }));
    return self;
  },

  customDocumentClasses: function () {
    return ['photo-page'];
  },
});
