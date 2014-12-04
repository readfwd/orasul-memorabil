'use strict';

var Backbone = require('../shims/backbone');
var View = Backbone.View;
var templates = require('../lib/templates');
var heroes = require('../lib/home-heroes.json');
var $ = Backbone.$;


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

    this.renderLogo();
    return self;
  },

  customDocumentClasses: function () {
    return ['home-page'];
  },

  renderLogo: function () {
    $('.logo-big').removeClass('hidden');
    $('.logo-small').addClass('hidden');
  }
});
