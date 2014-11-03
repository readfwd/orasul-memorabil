'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');


module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Despre proiect',
  slug: 'despre-proiect',
  template: templates.pages.despreProiect,

  render: function () {
    var self = this;
    self.$el.html(self.template());
    return self;
  },

  customDocumentClasses: function () {
    return ['about-page'];
  },
});
