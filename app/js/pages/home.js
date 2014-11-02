'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');
var heroes = require('../lib/home-heroes.json');


module.exports = View.extend({
  pageTitle: 'Orasul Memorabil | Home',
  slug: 'home',
  template: templates.pages.home,
  homePage: true,

  render: function () {
    var self = this;

    self.$el.html(self.template({
      hero: heroes[Math.floor(Math.random() * heroes.length)]
    }));

    self.$('body').attr('data-page', 'home').css("padding-top", 0);

    return self;
  }
});
