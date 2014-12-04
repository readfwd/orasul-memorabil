var when = require('when');
var monk = require('monk');
var request = require('request');
var fs = require('fs');
var s3 = require('s3');
var gm = require('gm');
var nodefn = require('when/node');

// Connect to the database
if (!process.env.MONGO_DB) {
  throw new Error("MONGO_DB is not set");
}

var db = monk(process.env.MONGO_DB);

db.on('error', function (err) {
  throw new Error("MongoDB connection error: " + err.toString());
});

var photosCollection = db.get('photos');


// AWS Credentials
var s3Opts = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
};

var s3Bucket = process.env.AWS_S3_BUCKET;

var s3Client = s3.createClient({
  s3Options: s3Opts,
});

function processPhoto() {
  photosCollection.findAndModify({
    query: { thumbnailUri: { $exists: false } },
    update: { $set: { thumbnailUri: "processing" } },
  }).then(function (photo) {
    if (!photo) { 
      console.log('Finished processing queue');
      return; 
    }

    var filename = photo.uri.replace(/.*\//, '');
    var thumbName = filename.replace('.', '_thumb.');
    var thumbUri = 'https://' + s3Bucket + '.s3-' + s3Opts.region + '.amazonaws.com/img/' + thumbName;

    console.log('Downloading ' + filename);

    var uploadStream = request(photo.uri).pipe(fs.createWriteStream(filename));

    return when.promise(function (resolve, reject) {
      uploadStream.on('error', reject);
      uploadStream.on('close', resolve);
    }).then(function () {
      console.log('Resizing image');
      var img = gm(filename).resize(600, null, '>');
      return nodefn.call(img.write.bind(img), thumbName);
    }).then(function () {
      var uploader = s3Client.uploadFile({
        localFile: thumbName,
        s3Params: {
          Bucket: s3Bucket,
          Key: 'img/' + thumbName,
          ACL: 'public-read',
        },
      });

      console.log('Uploading back');

      return when.promise(function (resolve, reject) {
        uploader.on('end', resolve);
        uploader.on('error', reject);
      });
    }).then(function () {
      return photosCollection.findAndModify({
        query: { _id: photo._id },
        update: { $set: { thumbnailUri: thumbUri } },
      });
    }).then(function () {
      fs.unlink(filename);
      fs.unlink(thumbName);
      console.log('Photo upload finished');
    });
  }).then(function () {
    if (!stopped) {
      processPhoto();
    } else {
      process.exit(0);
    }
  });
}

var stopped = false;
process.on('SIGINT', function () {
  console.log('Aborting process');
  stopped = true;
});

var instances = parseInt(process.argv[2]);
if (isNaN(instances)) {
  instances = 1;
}

console.log('Creating ' + instances + ' instances');

for (var i = 0; i < instances; i++) {
  processPhoto();
}

