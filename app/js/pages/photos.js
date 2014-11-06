'use strict';

var PhotosRecent = require ('./photos-recent');
var templates = require ('../lib/templates');
var $ = require ('../shims/jquery');

var PhotosSidebar = module.exports = PhotosRecent.extend({
  pageTitle: 'Orașul Memorabil | Albume',

  initialize: function (options) {
    options.template = options.template || templates.pages.photosRecent;
    this.sidebarTemplate = options.sidebarTemplate || templates.includes.sidebarTemplate;
    this.sidebarApiResource = options.sidebarApiResource || '/albums';

    var self = this;

    var apiUri =  'http://localhost:8080/api';
    // var apiUri = '/api';

    apiUri = apiUri + (this.sidebarApiResource);

    var xhr = $.ajax({
      url: apiUri,
      type:'get',
      dataType: 'json',
    });

    xhr.done(function (data) {
      self.data = data;
      self.renderSidebar();
    });

    xhr.fail(function () {
      console.log(arguments);
    });

    PhotosSidebar.__super__.initialize.call(this, options);
  },

  renderSidebar: function () {

    console.log(this.sidebarApiResource);

    this.sidebarApiResource = this.sidebarApiResource.slice(1);
    if (this.sidebarApiResource === 'folders') {
      this.sidebarApiResource = 'categorii';
    }
    if (this.sidebarApiResource === 'albums') {
      this.sidebarApiResource = 'albume';
    }
    this.sidebar = this.$('#photo-sidebar');
    console.log(typeof this.sidebarApiResource);
    this.sidebar.html(this.sidebarTemplate({
      type: this.sidebarApiResource,
      albums: this.data}
      ));
  },

  render: function () {
    PhotosSidebar.__super__.render.call(this);
  }
});
