# quick-src

## What is quick-src?
This module provides a subset of functionality of [gulp.src][gulp-src] with basically the same output format (stream of [Vinyl][vinyl] files). As its name implies, it may be useful when standard gulp.src is too slow, especially when dealing with huge directory trees with complex glob negations. 

Arguably the most useful feature of this module is the ability to asynchronously check whetner there is a need to recurse further into a directory subtree, based on both input and planned output paths.

[gulp-src]: https://github.com/gulpjs/gulp/blob/master/docs/API.md
[vinyl]: https://github.com/wearefractal/vinyl

## Usage

```javascript
const path = require("path");
const fs = require("fs");
const Promise = require("bluebird");
const quickSrc = require("./src");
const fsa = Promise.promisifyAll(fs);
const gulp = require('gulp');

function nodeModuleCopyNeeded(sourcePath, targetPath) { 

    return Promise.join(
        readPackageDescription(sourcePath),
        readPackageDescription(targetPath),
        (s, t) => {

            if (s && t && !s.private && s.version === t.version) { 
                return false;
            }

            return true;
        });
}

function readPackageDescription(folderPath) { 

    let packagePath = path.join(folderPath, "package.json");

    return fsa.readFileAsync(packagePath).then(JSON.parse).catch(err) => {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    });
}

let excludeSpecs = {
    "/build*": true,
    "/logs": true,
    "/bin": true,
    "/test": true,
    "/node_modules": {
        "_CHECK_CONTINUE": nodeModuleCopyNeeded,
        "/jsreport": true,
        "/vinyl*": true,
        "/watchify": true,
        "/api-*": {
            "/node_modules": true,
            "/typings": true,
            "/test": true,
            "/bin": true
        }
    }
};

let globalExcludeSpecs = {
    "/test.txt": true,
    "/*.log": true,
    "/important.log": false
};

quickSrc("/src/path", excludeSpecs, "/dest/path", globalExcludeSpecs).pipe(gulp.dest("/dest/path"));
```