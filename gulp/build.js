'use strict';

var config = require('./_config.js');
var paths = config.paths;
var $ = config.plugins;

var runServer = require('./server');

var _ = require('lodash');
var when = require('when');
var nodefn = require('when/node');

var path = require('path');
var fs = require('fs.extra');

var gulp = require('gulp');
var wiredep = require('wiredep').stream;
var vinylBuffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');

var penthouse = require('penthouse');
var templatizer = require('templatizer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync');
var useref = require('node-useref');
var StreamQueue = require('streamqueue');

var browserify = require('browserify');
var watchify = require('watchify');
var istanbul = require('browserify-istanbul');
var debowerify = require('debowerify');
var deamdify = require('deamdify');
var aliasify = require('aliasify');
var filterTransform = require('filter-transform');

//--- Generate JS files

// Generate JS functions from Jade templates.
gulp.task('templates' , function () {
  var templates = templatizer(paths.client + '/templates', null, {});
  return nodefn.call(fs.mkdirp, paths.client + '/js/lib').then(function () {
    return nodefn.call(fs.writeFile, paths.client + '/js/lib/templates.js', templates);
  });
});

// Load all Bower components into a single package
gulp.task('bower-components:js', function () {
  var packages = {};

  _.each(mainBowerFiles({ 
    filter: '**/*.js',
  }), function (file) {
    file = path.relative(paths.client + '/bower_components', file);
    packages[file.split('/')[0]] = true;
  });

  var contents = _.map(_.keys(packages), function(pkg) {
    var req = 'require(\'' + pkg + '\');\n';
    var gl = config.bowerGlobals[pkg];
    if (typeof(gl) === 'string') {
      gl = [gl];
    } else if ((typeof(gl) !== 'object') || !(gl instanceof Array)) {
      gl = [];
    }

    if (gl.length) {
      return 'window.' + gl.join(' = window.') + ' = ' + req;
    } 
    return req;
  }).join('');

  return nodefn.call(fs.mkdirp, paths.client + '/js/lib').then(function () {
    return nodefn.call(fs.writeFile, paths.client + '/js/lib/bower-components.js', contents);
  });
});

// Run this before any JS task, because Browserify needs to bundle them in.
gulp.task('js:dependencies', ['templates', 'bower-components:js'], function () {});

function generateMainJS(opts) {
  opts = opts || {};

  var browserifyOpts = _.extend({
    entries: [paths.client + '/js/main.js'],
    debug: !!opts.debug
  }, config.browserify);

  var bundle, stream;

  if (opts.incremental && config.shared.incrementalBundle) {
    bundle = config.shared.incrementalBundle;
  } else {
    bundle = browserify(browserifyOpts);

    bundle.transform(aliasify.configure(config.aliasify));
    bundle.transform(debowerify);
    bundle.transform(filterTransform(function (file) {
      return /bower_components/.test(file);
    } ,deamdify));
    if (opts.instanbul) {
      bundle.transform(istanbul({
        ignore: ['**/lib/**']
      }));
    }

    if (opts.incremental) { 
      bundle = watchify(bundle);
      config.shared.incrementalBundle = bundle;
    }
  }

  stream = bundle.bundle();

  if (opts.uglify) {
    stream = stream.pipe($.uglify());
  }

  return stream
    .pipe(source(paths.client + '/js/main.js'))
    .pipe($.rename('main.js'));
}

// Bundles Browserify for production; no source or coverage maps.
gulp.task('js:dist', ['js:dependencies', 'index.html:dist'], function () {
  return resolveRef(generateMainJS(), refSpec.js, 'js/main.js')
    .pipe($.uglify())
    .pipe(gulp.dest(paths.public));
});

// Bundles Browserify with Istanbul coverage maps.
gulp.task('js:coverage', ['js:dependencies'], function () {
  return generateMainJS({
    debug: true,
    istanbul: true,
  }).pipe(gulp.dest(paths.public + '/js/'));
});

// Bundles Browserify incrementally with source maps
gulp.task('js', ['js:dependencies'], function () {
  return generateMainJS({
    debug: true,
    incremental: true,
  }).pipe(gulp.dest(paths.public + '/js/'))
    .pipe(browserSync.reload({stream: true}));
});

// Same as above, just without re-running the deps (for watch)
gulp.task('js:no-deps', function () {
  return generateMainJS({
    debug: true,
    incremental: true,
  }).pipe(gulp.dest(paths.public + '/js/'))
    .pipe(browserSync.reload({stream: true}));
});

//--- Generate main.css

function generateMainCSS() {
  return gulp.src(paths.client + '/css/main.styl')
    .pipe($.stylus(config.stylus))
    .pipe($.autoprefixer(config.autoprefixer));
}

gulp.task('css', function () {
  return generateMainCSS()
    .pipe(gulp.dest(paths.public + '/css'))
    .pipe(browserSync.reload({stream: true}));
});

var cssPath; //Needed by critical
gulp.task('css:dist', ['index.html:dist'], function () {
  cssPath = 'css/main.css';
  return resolveRef(generateMainCSS(), refSpec.css, 'css/main.css')
    .pipe($.minifyCss())
    .pipe(gulp.dest(paths.public));
});

//--- Bower assets

function makeSymlink(src, dst) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  return nodefn.call(fs.rmrf, dst)
    .catch(function () {})
    .then(function () {
      return nodefn.call(fs.symlink, src, dst);
    });
}

// When doing a minimal build, just symlink the bower components folder
gulp.task('bower-components:assets:link', ['mkdirp'], function () {
  return makeSymlink(paths.client + '/bower_components', paths.public + '/bower_components');
});

// When doing a full build, extract just the necessary files (currently just fonts)
// Adapt this to your needs
gulp.task('bower-components:assets:copy', function () {
  return gulp.src(mainBowerFiles({
    filter: '**/*.{eot,svg,ttf,woff}'
  }))
    .pipe($.tap(function(file) {
      // Still not the perfect solution. A perfect solution would look at  
      // the associated CSS file's location and derive from there
      var relPath = path.relative(path.resolve(paths.client), file.path);
      var match = /bower_components\/[^\/]*/.exec(relPath);
      if (match) {
        file.base = path.resolve(paths.client, match[0]);
      }
    }))
    .pipe(gulp.dest(paths.public));
});

//--- Assets

gulp.task('mkdirp', function () {
  return nodefn.call(fs.mkdirp, paths.public);
});

function forEachAsset(cb) {
  var assetsPath = paths.client + '/assets';
  return nodefn.call(fs.readdir, assetsPath).then(function (files) {
    return when.all(_.map(files, function (file) {
      // Ignore dotfiles
      if (/^\./.test(file)) {
        return null;
      }
      return cb(file);
    }));
  });
}

// When doing a minimal build, just symlink all the assets
gulp.task('assets:link', ['mkdirp'], function () {
  return forEachAsset(function (file) {
    return makeSymlink(paths.client + '/assets/' + file, paths.public + '/' + file);
  });
});

// When doing a full build, remove the symlinks and copy them in full
gulp.task('assets:clean', function () {
  return forEachAsset(function (file) {
    return nodefn.call(fs.rmrf, paths.public + '/' + file);
  });
});

gulp.task('assets:copy', ['assets:clean'], function () {
  return gulp.src(paths.client + '/assets/**')
    .pipe(gulp.dest(paths.public));
});

//--- Generate index.html

function generateIndexHTML() {
  return gulp.src(paths.client + '/index.jade')
    .pipe($.jade({
      pretty: true
    }))
    .pipe(wiredep());
}

// Generate index.html for development
gulp.task('index.html', function () {
  return generateIndexHTML()
    .pipe(gulp.dest(paths.public))
    .pipe(browserSync.reload({stream: true}));
});

// Generate index.html for production
var refSpec = null; //Needed to build the JS and the CSS
gulp.task('index.html:dist', ['js:dependencies'], function () {
  return generateIndexHTML()
    .pipe($.tap(function (file) {
      var res = useref(file.contents.toString());
      file.contents = new Buffer(res[0]);
      refSpec = res[1];
    }))
    .pipe($.minifyHtml())
    .pipe(gulp.dest(paths.public));
});

//--- Resolve useref concatenation

function resolveRef(stream, spec, mainFile) {
  var q = new StreamQueue({ objectMode: true });

  _.each(spec[mainFile].assets, function (file) {
    if (file === mainFile) {
      q.queue(stream);
    } else {
      q.queue(gulp.src(paths.client + '/' + file));
    }
  });



  return q.done()
    .pipe(vinylBuffer())
    .pipe($.concat(mainFile));
}

//--- Put together builds

// Minimal development build.
gulp.task('build', ['index.html', 'js', 'css', 'bower-components:assets:link', 'assets:link']);

// CI testing build, with coverage maps.
gulp.task('build:coverage', ['index.html', 'js:coverage', 'css', 'bower-components:assets:link', 'assets:link']);

// Production build before critical CSS.
gulp.task('build:dist:base', ['index.html:dist', 'js:dist', 'css:dist', 'bower-components:assets:copy', 'assets:copy']);

//---- Critical CSS

var CRIT = '';

gulp.task('critical', ['build:dist:base'], function () {
  // Start a server for penthouse.
  return runServer(config.serverProxyPort)
    .then(function () {
      return nodefn.call(penthouse, {
        url: 'http://127.0.0.1:' + config.serverProxyPort,
        css: paths.public + '/' + cssPath,
        width: 1440,
        height: 900
      });
    })
    .then(function(criticalCSS) {
      CRIT = criticalCSS;
      $.util.log('Critical CSS size: ' + criticalCSS.length + ' bytes.');
    })
    .finally(function () {
      runServer.close();
    });
});

gulp.task('build:dist', ['critical'], function () {
  return gulp.src(paths.public + '/index.html')
    .pipe($.replace(
      '<link rel=stylesheet href=' + cssPath + '>',
      '<style>' + CRIT + '</style>'
    ))
    .pipe(gulp.dest(paths.public));
});
