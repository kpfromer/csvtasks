var gulp = require('gulp');
var ts = require('gulp-typescript');
var tsProject = ts.createProject('tsconfig.json');

const BUILD_FOLDER = 'lib';

gulp.task('default', function() {
  return gulp
    .src('src/**/*.ts')
    .pipe(tsProject())
    .js.pipe(gulp.dest(BUILD_FOLDER));
});
