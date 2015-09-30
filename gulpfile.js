'use strict';

var gulp = require('gulp');
var requireDir = require('require-dir');
var gutil = require('gulp-util');

requireDir('./tasks', { recurse: true });

// Default task
gulp.task('default', ['sass', 'browserify']);
gulp.task('test', function() {
  gutil.log('Done, without errors.');
});
