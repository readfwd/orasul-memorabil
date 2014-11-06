'use strict';

var PhotosRecent = require ('./photos-recent');
var templates = require ('../lib/templates');
var api = require('../lib/api');

var cache = {};

var PhotosSidebar = module.exports = PhotosRecent.extend({
  pageTitle: 'Orașul Memorabil | Albume',

  initialize: function (options) {
    options.template = options.template || templates.pages.photosSidebar;
    this.sidebarTemplate = options.sidebarTemplate || templates.includes.sidebarTemplate;
    this.sidebarApiResource = options.sidebarApiResource || '/albums';

    var self = this;

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
    var type = this.sidebarApiResource.slice(1);

    if (type === 'folders') {
      type = 'categorii';
    }
    if (type === 'albums') {
      type = 'albume';
    }
    if (type === 'decades') {
      type = 'timeline';
    }

    this.sidebar = this.$('#photo-sidebar');
    this.sidebar.html(this.sidebarTemplate({
      type: type,
      albums: this.data,
    }));
  },

  render: function () {
    PhotosSidebar.__super__.render.call(this);
    this.renderSidebar();
  }
});
