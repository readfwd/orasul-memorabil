'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');


module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Decade',
  slug: 'decade',
  template: templates.pages.timeline,

  render: function () {
    var self = this;
    self.$el.html(self.template());
    return self;
  },

  customDocumentClasses: function () {
    return ['timeline-page'];
  },
});
