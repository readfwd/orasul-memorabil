#!/usr/bin/env node

var express = require('express');
var compression = require('compression');
var seo = require('mean-seo');

var api = require('./srv/api');

// Create the express app
var app = express();

// Enable gzip compression.
app.use(compression());

// Enable PhantomJS SEO.
if (process.env.REDISCLOUD_URL) {
  // If we've got Redis available, use that.
  app.use(seo({ cacheClient: 'rediscloud' }));
} else {
  // Otherwise, use regular disk-based cache.
  app.use(seo());
}

// The static website
app.use(express.static(__dirname + '/dist'));

// The sitemap
app.get('/sitemap.xml', function(request, response) {
  response.sendFile(__dirname + '/dist/sitemap.xml');
});

// The photos API
app.use('/api', api);

// Index.html
app.get('*', function(request, response) {
  // var path = request.url.replace(/\?.*$/, '').replace(/\/$/, '').replace(/^\//, '');
  // var found = false;
  // for (var i = 0, n = validRoutes.length; i < n; i++) {
  //   if (validRoutes[i] === path) {
  //     found = true;
  //     break;
  //   }
  // }
  response.sendFile(__dirname + '/dist/index.html');
});

var port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Listening on port: ' + port + '.');
});
