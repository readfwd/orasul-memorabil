'use strict';

var PhotosRecent = require ('./photos-recent');
var templates = require ('../lib/templates');
var api = require('../lib/api');
var _ = require ('lodash');

var cache = {};

var PhotosSidebar = module.exports = PhotosRecent.extend({
  pageTitle: 'Orașul Memorabil | Albume',

  initialize: function (options) {
    options.template = options.template || templates.pages.photosSidebar;
    this.sidebarTemplate = options.sidebarTemplate || templates.includes.sidebarTemplate;
    this.sidebarApiResource = options.sidebarApiResource || '/albums';

    var self = this;
    this.filter = options.filter;

    // console.log(_.values(options.filter)[0])

    var cacheEntry = cache[self.sidebarApiResource];
    if (cacheEntry) {
      self.data = cacheEntry;
    } else {
      api(self.sidebarApiResource).then(function (data) {
        cache[self.sidebarApiResource] = data;
        self.data = data;
        self.renderSidebar();
      });
    }

    PhotosSidebar.__super__.initialize.call(self, options);
  },

  renderSidebar: function () {
    this.type = this.sidebarApiResource.slice(1);

    if (this.type === 'folders') {
      this.type = 'categorii';
    }
    if (this.type === 'albums') {
      this.type = 'albume';
    }
    if (this.type === 'decades') {
      this.type = 'timeline';
    }

    this.sidebar = this.$('#photo-sidebar');
    this.sidebar.html(this.sidebarTemplate({
      type: this.type,
      albums: this.data,
    }));

    this.handleLinkClick();

  },

  render: function () {
    PhotosSidebar.__super__.render.call(this);
    this.renderSidebar();
  },

  handleLinkClick: function () {
    this.$('#photo-sidebar a').parent().removeClass('active');
    this.$('#photo-sidebar a[href="/photos/' + this.type + '/'+ encodeURIComponent(_.values(this.filter)[0]) + '"]').parent().addClass('active');
  }
});
