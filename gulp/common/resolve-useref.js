var config = require('./config');
var paths = config.paths;
var $ = config.plugins;

var gulp = require('gulp');
var _ = require('lodash');

var pipeErrors = require('./pipe-errors');

var vinylBuffer = require('vinyl-buffer');
var StreamQueue = require('streamqueue');

function resolveUseref(stream, spec, mainFile) {
  var q = new StreamQueue({ objectMode: true });

  q = pipeErrors(q);

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

module.exports = resolveUseref;
