#!/usr/bin/env node

var express = require('express');
var compression = require('compression');
var seo = require('mean-seo');
var modRewrite = require('connect-modrewrite');

// For uploading photos to S3 / MongoDB
var api = require('./srv/api');

// Create the express app
var app = express();

// Sitemap
app.use(modRewrite([ '^/sitemap.xml$ /api/sitemap.xml' ]));

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

// The photos API
app.use('/api', api);

var dist = __dirname + '/../public';

// The static website
app.use(express.static(dist));

// Index.html
app.get('*', function(request, response) {
  response.sendFile(dist + '/index.html');
});

var port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Listening on port: ' + port + '.');
  if (process.send) { process.send('serverStarted'); }
});
