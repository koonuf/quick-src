# quick-src

## What is quick-src?
This module provides a subset of functionality of [gulp.src][gulp-src] with basically the same output format (stream of [Vinyl][vinyl] files). As its name implies, it may be useful when standard gulp.src is too slow, especially when dealing with huge directory trees with complex glob negations. 

Arguably the most useful feature of this module is the ability to asynchronously check whether there is a need to recurse further into a directory subtree, based on both input and planned output paths.

[gulp-src]: https://github.com/gulpjs/gulp/blob/master/docs/API.md
[vinyl]: https://github.com/wearefractal/vinyl

## API

The only exported function of the module has the following parameters:

#### basePath
Required. Should be a path to directory where files are to be streamed from.

#### exceptionsSpec
Optional. By default, all files from _basePath_ will be streamed. This parameter is one of two ways to filter the stream. As specified in the usage example below, it should be an object tree of arbitrary depth, specifying paths which should be excluded from the resulting stream. Each key starting with _/_ specifies a filename (as in "everything is a file") at specific directory level (_/_ prefix is omitted during matching). If multiple keys match a filename, the longest key wins (similar to how Nginx configuration works). When a filename key matches, 3 things can happen depending on key value:
* Thuthy object - recurse into sub-directory
* Thuthy non-object - exclude file from the stream (directory is a file as well)
* Falsy value - include file in the stream (useful to override shorter key for specific files)

Alternatively, _CHECK_CONTINUE_ key specifies a function, accepting full source and target paths (target path being based on 3rd parameter). This function is being called on each filename in the directory. If this function returns falsy value or Promise of falsy value, specific filename is excluded from the resulting stream. As specified in the usage example below, it can be useful for large sub-directories, where its possible to quickly decide whether there is a need to continue recursing into specific directory.

#### targetBasePath
Optional. Planned target directory. This directory should not exist and will never be touched. It is only used to calculate targetPath value for _CHECK_CONTINUE_ callback (possible part of 2nd parameter described above).

#### globalExcludeSpec
Optional. Similar to _exceptionsSpec_ above, but should be a shallow tree, applied at each level. Most useful to exclude all files by extension or similar path pattern.


## Usage

```javascript
const path = require("path");
const fs = require("fs");
const Promise = require("bluebird");
const quickSrc = require("quick-src");
const fsa = Promise.promisifyAll(fs);
const gulp = require('gulp');

let excludeSpecs = {
    "/build*": true,
    "/logs": true,
    "/bin": true,
    "/test": true,
    "/node_modules": {
        "_CHECK_CONTINUE": nodeModuleCopyNeeded, // please check each file/directory under node_modules
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
    "/important.log": false // overriding shorter key to include the file
};

quickSrc("/src/path", excludeSpecs, "/dest/path", globalExcludeSpecs).pipe(gulp.dest("/dest/path"));

function nodeModuleCopyNeeded(sourcePath, targetPath) { 

    // if node module exists in target directory, is public and version hasn't changed, ignore it
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
```