'use strict';
//──────────────────────────────────────────────────────────────────────────────
// Information
/*──────────────────────────────────────────────────────────────────────────────
 There are currently three main tasks:
 - prod  : no-comments, minify, sourcemaps, uglify
 - dev   : comments, no-minify, no-sourcemap, no-uglify
 - watch : same as dev, but with live reload

 https://github.com/gulpjs/gulp/blob/master/docs/API.md
  Are your tasks running before the dependencies are complete?
  Make sure your dependency tasks are correctly using the async run hints:
  take in a callback or return a promise or event stream.

 http://schickling.me/synchronous-tasks-gulp/
  In the official gulp docs on Github they recommend using callback functions
  to run tasks synchronously, but that does not work. Instead return the
  actual task and gulp knows on its own when it's done.

 Notes:
 - short paths in STDOUT
 - prod and dev tasks are destination files.
 - watch tasks are source files, which depends on source files.
*/

//──────────────────────────────────────────────────────────────────────────────
// Configuration
//──────────────────────────────────────────────────────────────────────────────
const config = {
    glob: {
        extentions: {
            transpile: 'es6',
        }
    }
};

//──────────────────────────────────────────────────────────────────────────────
// Imports
//──────────────────────────────────────────────────────────────────────────────
import packageJson     from './package.json';
import Glob            from 'glob';
import Gulp            from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';

//──────────────────────────────────────────────────────────────────────────────
// Constants
//──────────────────────────────────────────────────────────────────────────────
const $ = gulpLoadPlugins();
const isProd = $.util.env._.includes('prod');
const srcResourcesDir = 'src/main/resources';
const dstResourcesDir = 'build/resources/main';

//──────────────────────────────────────────────────────────────────────────────
// Serverside es6 -> js
//──────────────────────────────────────────────────────────────────────────────
function transpileResource({
    filePath,
    base         = srcResourcesDir,
    dest         = dstResourcesDir,
    env          = isProd ? 'prod' : 'dev',
    plumber      = env === 'dev' ? true : false,
    comments     = env === 'dev' ? true : false,
    compact      = env === 'dev' ? false : true,
    minified     = env === 'dev' ? false : true,
    plugins      = [],
    presets      = [
        [
            'es2015', {
                loose: true
            }
        ]
    ],
    babelOptions = {
        babelrc: false, // The .babelrc file should only be used to transpile gulpfile.babel.js itself.
        comments,
        compact,
        minified,
        plugins,
        presets
    }
}) {
    let stream = Gulp.src(filePath, { base });
    if(plumber) { stream = stream.pipe($.plumber()); }
    return stream.pipe($.babel(babelOptions)).pipe(Gulp.dest(dest));
}

//──────────────────────────────────────────────────────────────────────────────
// Generate tasks and watchFiles
//──────────────────────────────────────────────────────────────────────────────
let prodTasks  = new Set();
let watchFiles = new Set();


Glob.sync(`${srcResourcesDir}/**/*.${config.glob.extentions.transpile}`).forEach(srcRelFilePath => {
    const dstRelFilePath = srcRelFilePath.replace(srcResourcesDir, dstResourcesDir);
    //console.log('transpile srcRelFilePath:', srcRelFilePath, ' dstRelFilePath:', dstRelFilePath);
    Gulp.task(dstRelFilePath, () => {
        transpileResource({ filePath: srcRelFilePath });
    });
    prodTasks.add(dstRelFilePath);

    Gulp.task(srcRelFilePath, () => {
        Gulp.start(dstRelFilePath);
    });
    watchFiles.add(srcRelFilePath);
});

prodTasks = [...prodTasks];
//console.log('prodTasks:', prodTasks); //process.exit();
const devTasks = prodTasks;
watchFiles = [...watchFiles];
//console.log('watchFiles:', watchFiles); //process.exit();

//──────────────────────────────────────────────────────────────────────────────
// Main tasks:
//──────────────────────────────────────────────────────────────────────────────
Gulp.task('prod', () => {
    prodTasks.forEach(dstRelFilePath => {
        Gulp.start(dstRelFilePath);
    });
});

Gulp.task('dev', () => {
    devTasks.forEach(dstRelFilePath => {
        Gulp.start(dstRelFilePath);
    });
});

Gulp.task('watch', ['dev'], () => {
    Gulp.watch(watchFiles, event => {
        Gulp.start(event.path.replace(`${__dirname}/`, ''));
    });
});

Gulp.task('default', ['prod']);
