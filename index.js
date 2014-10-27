#!/usr/bin/env node

var express = require('express');
var compression = require('compression');
var seo = require('mean-seo');
var monk = require('monk');
var bodyParser = require('body-parser');
var _ = require('lodash');
var multer = require('multer');
var s3 = require('s3');
var when = require('when');

var Util = require('./srv/util');

// Connect to the database
if (!process.env.MONGO_DB) {
  throw new Error("MONGO_DB is not set");
}

var db = monk(process.env.MONGO_DB);

db.on('error', function (err) {
  throw new Error("MongoDB connection error: " + err.toString());
});

var photosCollection = db.get('photos');

// Create the express app
var app = express();

// Enable gzip compression.
app.use(compression());

// Enable bodyparser
app.use(bodyParser.urlencoded({ extended: true }));

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
var api = express.Router();
app.use('/api', api);

app.get('/api/photos', function(request, response) {
  Util.sendResponse(response, function() {
    return photosCollection.find().then(function (photos) {
      _.each(photos, function (photo) {
        delete photo._id;
      });
      return photos;
    });
  });
});

var s3Opts = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
};

var s3Bucket = process.env.AWS_S3_BUCKET;

if (s3Opts.accessKeyId && s3Opts.secretAccessKey && s3Opts.region && s3Bucket) {
  app.get('/api/add_photo', function(request, response) {
    response.sendFile(__dirname + '/srv/add_photo.html');
  });

  app.use('/api/add_photo', multer({
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }));

  var s3Client = s3.createClient({
    s3Options: s3Opts,
  });

  app.post('/api/add_photo', function(request, response) {
    Util.sendResponse(response, function() {
      var uri = 'https://' + s3Bucket + '.s3-' + s3Opts.region + '.amazonaws.com/img/' + request.files.file.name;
      var dbEntry = {
        uri: uri,
        title: request.body.title,
        description: request.body.description,
        album: request.body.album,
        tags: request.body.tags.split(/\s*,\s*/),
      };

      var uploader = s3Client.uploadFile({
        localFile: request.files.file.path,
        s3Params: {
          Bucket: s3Bucket,
          Key: 'img/' + request.files.file.name,
          ACL: 'public-read',
        },
      });

      return when.all([
        when.promise(function (resolve, reject) {
          uploader.on('end', resolve);
          uploader.on('error', reject);
        }), 
        photosCollection.insert(dbEntry)
      ]).then(function() {
        return "File successfully uploaded.";
      });
    });
  });
}

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
