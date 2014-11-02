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
    if (isNaN(count)) { count = 10; }
    if (count > 50) { count = 50; }
    var query = {};
    if (after) {
      query = { _id: { '$lt': photosCollection.id(after) } };
    }
    if (!isNaN(decade)) {
      options = ['a' + decade];
      for (var i = 0; i < 10; i++) {
        options.push((decade + i).toString());
      }
      query.tags = { '$in': options };
    }
    return photosCollection.find(query, {
      sort: { '_id': -1 },
      limit: count
    });
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

