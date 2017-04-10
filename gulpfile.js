var gulp = require("gulp");
var sass = require("gulp-sass");
var plumber = require("gulp-plumber");
var csso = require('gulp-csso');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var ngannotate = require('gulp-ng-annotate');
var templateCache = require('gulp-angular-templatecache');
gulp.task('sass', function() {
   gulp.src('public/stylesheets/style.scss')
      .pipe(plumber())
      .pipe(sass())
      .pipe(csso())
      .pipe(gulp.dest('public/stylesheets'));
});

gulp.task('watch', function() {
   gulp.watch('public/stylesheets*.scss', ['saas']);
   gulp.watch(['public/app/**/*.js', '!public/app/app.min.js', '!public/app/vendor'], ['compress']);
});

gulp.task('compress', function() {
   gulp.src([
         'public/app/vendor/jquery.js',
         'public/app/vendor/angular.js',
         'public/app/vendor/*.js',
         'public/app/app.js',
         'public/app/services/*.js',
         'public/app/controllers/navbar.js',
         'public/app/controllers/main.js',
         'public/app/controllers/login.js',
         'public/app/controllers/detail.js',
         'public/app/controllers/add.js',
         'public/app/controllers/*.js',

         'public/app/filters/*.js',
         'public/app/directives/*.js'
      ], {
         base: 'public/app/'
      })
      .pipe(concat('app.min.js'))
      .pipe(ngannotate())
      .pipe(uglify())
      .pipe(gulp.dest('public/app'));
});

gulp.task('templates', function() {
   gulp.src('public/views/**/*.html')
      .pipe(templateCache({
         root: 'views',
         module: 'MyApp'
      }))
      .pipe(gulp.dest('public'))
})
gulp.task('default', ['sass', 'compress', 'templates', 'watch']);
