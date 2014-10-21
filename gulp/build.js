'use strict';

/* global __dirname */
var gulp = require('gulp');

var config = require('./_config.js');
var paths = config.paths;
var $ = config.plugins;
var _ = require('lodash');

var wiredep = require('wiredep').stream;
var nodefn = require('when/node');
var fs = require('fs');
var exec = require('child_process').exec;
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var browserifyIncremental = require('browserify-incremental');
var browserSync = require('browser-sync');
var templatizer = require('templatizer');
var penthouse = require('penthouse');
var express = require('express');
var path = require('path');
var mainBowerFiles = require('main-bower-files');
var fs = require('fs');

var opts = {
  autoprefixer: [
    'ie >= 8',
    'ie_mob >= 9',
    'ff >= 30',
    'chrome >= 30',
    'safari >= 6',
    'opera >= 23',
    'ios >= 6',
    'android >= 2.3',
    'bb >= 9'
  ]
};

// URL replacement logic

var urlReplacements = {};
var moveToS3 = !!process.env.MOVE_TO_S3;
var aws = {
  "key": process.env.AWS_ACCESS_KEY,
  "secret": process.env.AWS_SECRET_KEY,
  "region": process.env.AWS_REGION,
  "bucket": process.env.AWS_S3_BUCKET,
};

function replaceInTemplates(templates) {
  _.each(urlReplacements, function(to, from) {
    var escapedFrom = from.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    var escapedTo = to.replace('$', '$$');
    templates = templates.replace(new RegExp('([\'"])' + escapedFrom, 'g'), '$1' + escapedTo);
  });
  return templates;
}

function replaceUrl(url) {
  var repl;
  if ((repl = urlReplacements[url])) {
    return repl;
  }
  return url;
}

if (moveToS3) {
  gulp.task('assets:move:s3', ['assets:dist'], function () {});
}

gulp.task('replace-urls', moveToS3 ? ['assets:move:s3'] : [], function () {
  var json = JSON.stringify(urlReplacements);
  return nodefn.call(fs.writeFile, paths.app + '/js/lib/url-replacements.json', json);
});

// Wire Bower dependencies into the main jade file.
gulp.task('wiredep', function () {
  return gulp.src(paths.app + '/index.jade')
    .pipe(wiredep())
    .pipe(gulp.dest(paths.app));
});

// Turn index.jade into an HTML file.
gulp.task('index.html', ['wiredep', 'replace-urls'], function () {
  return gulp.src(paths.app + '/index.jade')
    .pipe($.jade({
      pretty: true
    }))
    .pipe($.tap(function (file) {
      if (!file.stat.isFile()) { return; }
      file.contents = new Buffer(replaceInTemplates(file.contents.toString()));
    }))
    .pipe(gulp.dest(paths.tmp))
    .pipe(browserSync.reload({stream: true}));
});

// Generate JS functions from Jade templates.
// Run this before any JS task, because Browserify needs to bundle them in.
gulp.task('templates', ['replace-urls'], function () {
  var templates = templatizer(paths.app + '/templates', null, {});
  templates = replaceInTemplates(templates);
  return nodefn.call(fs.writeFile, paths.app + '/js/lib/templates.js', templates);
});

// Common outputs between all of the JS tasks.
var spitJs = function (bundleStream) {
  return bundleStream
    .pipe(source(paths.app + '/js/main.js'))
    .pipe($.rename('main.js'))
    .pipe(gulp.dest(paths.tmp + '/js/'));
};

// Bundles Browserify for production; no source or coverage maps.
gulp.task('js', ['templates'], function () {
  var bundleStream = browserify(paths.app + '/js/main.js')
    .bundle();

  return spitJs(bundleStream);
});

// Bundles Browserify with sourcemaps.
gulp.task('js:dev', ['templates'], function () {
  // Incremental development bundle.
  // Stored as a global variable so it can be reused
  // between compiles by `browserify-incremental`
  global.incDevBundle = global.incDevBundle || browserifyIncremental({
      entries: paths.app + '/js/main.js',
      debug: true
    });

  var bundleStream = global.incDevBundle
    .bundle()
    .on('error', config.handleError);

  return spitJs(bundleStream)
    .pipe(browserSync.reload({stream: true}));
});

// Copies over CSS.
gulp.task('css', function () {
  return gulp.src(paths.app + '/css/main.styl')
    .pipe($.stylus())
    .pipe($.autoprefixer(opts.autoprefixer))
    .pipe(gulp.dest(paths.tmp + '/css'))
    .pipe(browserSync.reload({stream: true}));
});

// Deletes the assets folder or symlink.
gulp.task('assets:clean', function () {
  return nodefn.call(exec, 'rm -r "' + paths.tmp + '/assets"').catch(function(){});
});

// Creates the .tmp folder if it does not already exists.
gulp.task('mktmp', function () {
  return nodefn.call(exec, 'mkdir -p "' + paths.tmp + '"');
});

// Copies over assets.
gulp.task('assets', ['assets:clean', 'mktmp'], function () {
  return nodefn.call(fs.symlink, '../app/assets', paths.tmp + '/assets');
});

gulp.task('fonts', function () {
  return gulp.src(mainBowerFiles())
    .pipe($.filter('**/*.{eot,svg,ttf,woff}'))
    .pipe($.flatten())
    .pipe(gulp.dest(paths.dist + '/fonts'));
});

// Copies over assets for production.
gulp.task('assets:dist', ['fonts'], function () {
  var imgFilter = $.filter('**/img/**/*.*');
  var stream = gulp.src(paths.app + '/assets/**/*')
    .pipe(imgFilter)
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(imgFilter.restore());

  if (moveToS3) {
    return stream
      .pipe($.tap(function (file) {
        if (!file.stat.isFile()) { return; }
        var fileName = file.path.replace(file.base, '');
        urlReplacements['/assets/' + fileName] = 'https://' + aws.bucket + '.s3-' + aws.region + '.amazonaws.com/' + fileName;
      }))
      .pipe($.s3(aws));
  } else {
    return stream.pipe(gulp.dest(paths.dist + '/assets/'));
  }
});

// Common tasks between all the different builds.
gulp.task('build:common', ['index.html', 'css']);

// Minimal development build.
gulp.task('build', ['build:common', 'js:dev', 'assets']);

// CI testing build, with coverage maps.
gulp.task('build:test', ['build:common', 'assets']);

var cssPath = '';

// Production-ready build.
gulp.task('build:dist:base', ['build:common', 'js', 'assets:dist'], function () {
  var jsFilter = $.filter('**/*.js');
  var cssFilter = $.filter('**/*.css');
  var htmlFilter = $.filter('**/*.html');
  var assets = $.useref.assets();

  return gulp.src(paths.tmp + '/index.html')
    .pipe(assets)
    .pipe($.rev())

    .pipe(jsFilter)
    .pipe($.uglify())
    .pipe(jsFilter.restore())

    .pipe(cssFilter)
    .pipe($.minifyCss())
    .pipe($.tap(function (file) {
      // Get the path of the revReplaced CSS file.
      var tmpPath = path.resolve(paths.tmp);
      cssPath = file.path.replace(tmpPath, '');
    }))
    .pipe(cssFilter.restore())

    .pipe(assets.restore())
    .pipe($.useref())

    .pipe(htmlFilter)
    .pipe($.minifyHtml())
    .pipe(htmlFilter.restore())

    .pipe($.revReplace())
    .pipe(gulp.dest(paths.dist));
});

var CRIT = '';

gulp.task('critical', ['build:dist:base'], function (done) {
  // Start a local express server for penthouse.
  var app = express();
  var port = 8765;

  app.use(express.static(path.resolve(__dirname, '../dist')));

  app.get('*', function (request, response) {
    response.sendFile(path.resolve(__dirname, '../dist/index.html'));
  });

  var server = app.listen(port, function () {
    penthouse({
      url: 'http://localhost:' + port,
      css: paths.dist + cssPath,
      width: 1440,
      height: 900
    }, function (err, criticalCSS) {
      CRIT = criticalCSS.replace('\n', '');
      $.util.log('Critical CSS size: ' + criticalCSS.length + ' bytes.');
      server.close();
      done();
    });
  });
});

gulp.task('build:dist', ['critical'], function () {
  return gulp.src(paths.dist + '/index.html')
    .pipe($.replace(
      '<link rel=stylesheet href=' + cssPath + '>',
      '<style>' + CRIT + '</style>'
    ))
    .pipe(gulp.dest(paths.dist));
});
