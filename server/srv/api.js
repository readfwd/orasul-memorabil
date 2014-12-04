var when = require('when');
var auth = require('basic-auth');
var bcrypt = require('bcrypt');
var express = require('express');
var _ = require('lodash');
var multer = require('multer');
var s3 = require('s3');
var monk = require('monk');
var fs = require('fs');
var gm = require('gm');

var Util = require('./util');

var api = express.Router();

var routes = require('../../client/js/lib/routes.json');
var xml = require('xml-writer');

module.exports = api;

// Connect to the database
if (!process.env.MONGO_DB) {
  throw new Error("MONGO_DB is not set");
}

var db = monk(process.env.MONGO_DB);

db.on('error', function (err) {
  throw new Error("MongoDB connection error: " + err.toString());
});

var photosCollection = db.get('photos');

//CORS
api.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//Get the photos
api.get('/recent_photos', function(request, response) {
  Util.sendResponse(response, function() {
    var after = request.query.after;
    var count = parseInt(request.query.count);
    var decade = parseInt(request.query.decade);
    var folder = request.query.folder;
    var album = request.query.album;
    if (isNaN(count)) { count = 10; }
    if (count > 50) { count = 50; }
    var query = {};

    // remove all records with tags 'E0' or 'spate'
    query.tags = { '$nin': ['E0','spate'] };

    if (after) {
      query._id = { '$lt': photosCollection.id(after) };
    }
    if (!isNaN(decade)) {
      options = ['a' + decade];
      for (var i = 0; i < 10; i++) {
        options.push((decade + i).toString());
      }
      // also remove "E0" and "spate"from tags when selecting tags! :)
      query.tags = { '$in': options, '$nin': ['E0','spate'] };
    }
    if (album) { query.album = album; }
    if (folder) { query.folder = folder; }

    return photosCollection.find(query, {
      sort: { '_id': -1 },
      limit: count
    });
  });
});

function getAlbums() {
    return photosCollection.distinct('album');
}

function getFolders() {
    return photosCollection.distinct('folder');
}

function getDecades() {
    var r = [];
    for (var i = 2010; i >= 1890; i -= 10) {
      r.push(i);
    }
    return r;
}

api.get('/albums', function(request, response) {
  Util.sendResponse(response, function() {
    return getAlbums();
  });
});

api.get('/folders', function(request, response) {
  Util.sendResponse(response, function() {
    return getFolders();
  });
});

api.get('/decades', function(request, response) {
  Util.sendResponse(response, function() {
    return getDecades();
  });
});

api.get('/photo/:id', function (request, response) {
  Util.sendResponse(response, function() {
    return photosCollection.find({ _id: request.param('id') }).then(function(d) {
      if (!d.length) {
        throw new Util.HTTPError(404, 'No photo with this id');
      }
      return d[0];
    });
  });
});

// Sitemap
api.get('/sitemap.xml', function (request, response) {
  when.all([getAlbums(), getFolders(), getDecades()])
    .then(function(v) {
      var albums = v[0];
      var folders = v[1];
      var decades = v[2];
  
      var sitemap = new xml();
      var baseLink = "http://orasulmemorabil.ro/";

      sitemap.startDocument();
      sitemap.startElement('urlset').writeAttribute('xmlns', "http://www.sitemaps.org/schemas/sitemap/0.9")
        .writeAttribute('xmlns:xsi', "http://www.w3.org/2001/XMLSchema-instance")
        .writeAttribute('xsi:schemaLocation', "http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd");

      var expandedRoutes = {};
      var euc = encodeURIComponent;
      _.each(routes, function (route, path) {
        path = path.replace('(/)', '/'); 
        if (path.match(/\([^)(]*\)/)) {
          expandedRoutes[path.replace(/\([^()]*\)/, '')] = route;
          path = path.replace(/\(([^()]*)\)/, '$1');
        }
        if (path.match(/:folder/)) {
          _.each(folders, function (folder) {
            expandedRoutes[path.replace(/:folder/, euc(folder))] = route;
          });
        } else if (path.match(/:album/)) {
          _.each(albums, function (album) {
            expandedRoutes[path.replace(/:album/, euc(album))] = route;
          });
        } else if (path.match(/:decade/)) {
          _.each(decades, function (decade) {
            expandedRoutes[path.replace(/:decade/, euc(decade))] = route;
          });
        } else {
          expandedRoutes[path] = route;
        }
      });

      _.each(expandedRoutes, function (route, path) {
        if (route.skip) { return; }

        sitemap.startElement('url')
          .startElement('loc').text(baseLink + path).endElement()
          .startElement('priority').text(route.priority).endElement()
          .startElement('changefreq').text(route.changeFreq).endElement()
          .endElement();

      });
      sitemap.endElement();
      sitemap.endDocument();
      response.end(sitemap.toString());
    });
});

// AWS Credentials
var s3Opts = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
};

var s3Bucket = process.env.AWS_S3_BUCKET;

// Basic Auth
function doAuth(req, res, fn) {
  var cred = auth(req);

  function failLogin() {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="example"'
    });
    res.end("<html><body><h1>Incorrect login</h1></body></html>");
  }

  if (!cred || cred.name !== "admin") {
    failLogin();
    return;
  }

  bcrypt.compare(cred.pass, process.env.BASIC_PASSWORD, function (err, comp) {
    if (err || !comp) {
      failLogin();
    } else {
      fn();
    }
  });
}

function uploadToS3(file, name) {
  var uploader = s3Client.uploadFile({
    localFile: file,
    s3Params: {
      Bucket: s3Bucket,
      Key: 'img/' + name,
      ACL: 'public-read',
    },
  });
  return when.promise(function (resolve, reject) {
    uploader.on('end', resolve);
    uploader.on('error', reject);
  });
}

// The actual API
if (s3Opts.accessKeyId && s3Opts.secretAccessKey && s3Opts.region && s3Bucket) {
  api.get('/add_photo', function(request, response) {
    doAuth(request, response, function () {
      response.sendFile(__dirname + '/add_photo.html');
    });
  });

  api.use('/add_photo', multer({
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }));

  var s3Client = s3.createClient({
    s3Options: s3Opts,
  });

  api.post('/add_photo', function(request, response) {
    doAuth(request, response, function () {
      Util.sendResponse(response, function() {
        if (!request.files.file) {
          throw new Util.HTTPError(500, "You need to upload a file");
        }

        var uri = 'https://' + s3Bucket + '.s3-' + s3Opts.region + '.amazonaws.com/img/' + request.files.file.name;

        var thumbPath = request.files.file.path.replace('.', '_thumb.');
        var thumbName = thumbPath.replace(/.*\//, '');
        var thumbUri = 'https://' + s3Bucket + '.s3-' + s3Opts.region + '.amazonaws.com/img/' + thumbName;

        var dbEntry = {
          uri: uri,
          thumbnailUri: thumbUri,
          title: request.body.title || request.files.file.originalname.replace(/\.[^.]*$/, ''),
          description: request.body.description || '',
          album: request.body.album || '',
          folder: request.body.folder || '',
          tags: (request.body.tags || '').split(/\s*,\s*/),
        };

        var img = gm(request.files.file.path).resize(600, null, '>');

        return when.all([
          uploadToS3(request.files.file.path, request.files.file.name),
          nodefn.call(img.write.bind(img), thumbName).then(function () {
            return uploadToS3(thumbPath, thumbName);
          }).then(function() {
            fs.unlink(thumbPath);
          }),
          photosCollection.insert(dbEntry)
        ]).then(function() {
          return "File successfully uploaded.";
        });
      });
    });
  });
}
