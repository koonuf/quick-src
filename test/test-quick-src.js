"use strict";

const path = require("path");
const File = require("vinyl");
const expect = require("expect");
const miss = require("mississippi");
const fs = require("fs");

const quickSrc = require("../quick-src");

const pipe = miss.pipe;
const concat = miss.concat;

const inputRelative = "./fixtures";
const inputBase = path.join(__dirname, inputRelative);

describe(".quick-src", function () {

    function runTest(sourceStream, assert, done) { 
        // concat calls assert before done(err), so error
        // would be misleading without explicit error listener
        sourceStream.on("error", done);
        pipe(sourceStream, concat(assert), done);
    }

    it("finds expected file", function (done) {

        let expectedFilePath = path.join(inputBase, "level1-a/test.txt");
        let expectedContents = "test.txt contents";
        
        let file = new File({
            base: inputBase,
            path: expectedFilePath,
            contents: new Buffer(expectedContents),
            stat: fs.statSync(expectedFilePath),
        });
    
        let specs = {
            "/*": true,
            "/*a": {
                "/garbage.txt": true
            }
        };
        
        let sourceStream = quickSrc(inputBase, specs);
    
        function assert(files) {

            expect(files.length).toEqual(1, "matching file count");
            expect(files[0]).toEqual(file);
        }

        runTest(sourceStream, assert, done);
    });

    it("calls continuation check on each sub dir", function (done) {

        let checkSourcePaths = [], checkTargetPaths = [];

        function check(sourcePath, targetPath) { 
            checkSourcePaths.push(sourcePath);
            checkTargetPaths.push(targetPath);
            return false;
        }
            
        let specs = {
            "/*": true,
            "/*b": {
                "/level2-b-1": {
                    "_CHECK_CONTINUE": check
                }
            }
        };
                
        let sourceStream = quickSrc(inputBase, specs, "/test/target");
            
        function assert(files) {
            expect(files.length).toEqual(0, "matching file count");

            expect(checkSourcePaths.length).toEqual(2);
            expect(checkTargetPaths.length).toEqual(2);

            checkSourcePaths.sort((a, b) => a.localeCompare(b));
            checkTargetPaths.sort((a, b) => a.localeCompare(b));

            expect(checkSourcePaths[0]).toEqual(path.join(inputBase, "level1-b", "level2-b-1", "test-dir1"));
            expect(checkSourcePaths[1]).toEqual(path.join(inputBase, "level1-b", "level2-b-1", "test-dir2"));

            expect(checkTargetPaths[0]).toEqual(path.join("/test/target", "level1-b", "level2-b-1", "test-dir1"));
            expect(checkTargetPaths[1]).toEqual(path.join("/test/target", "level1-b", "level2-b-1", "test-dir2"));            
        }
         
        runTest(sourceStream, assert, done);
    });

    it("respects global exceptions", function (done) {
            
        let specs = {
            "/*a": {
                "/garbage.txt": true
            }
        };

        let globalSpecs = {
            "/test.txt": true,
            "/level*b": true
        };
                
        let sourceStream = quickSrc(inputBase, specs, null, globalSpecs);
            
        function assert(files) {
            expect(files.length).toEqual(0, "matching file count");
        }
        
        runTest(sourceStream, assert, done);
    });

    it("respects longest keyed spec item", function (done) {

        let expectedFilePath = path.join(inputBase, "level1-a/test.txt");
        let expectedContents = "test.txt contents";
        
        let file = new File({
            base: inputBase,
            path: expectedFilePath,
            contents: new Buffer(expectedContents),
            stat: fs.statSync(expectedFilePath),
        });        
        
        let specs = {
            "/*": true,
            "/*a": {
                "/*.txt": true,
                "/test.txt": false
            }
        };
            
        let sourceStream = quickSrc(inputBase, specs);
        
        function assert(files) {
            expect(files.length).toEqual(1, "matching file count");
            expect(files[0]).toEqual(file);
        }
    
        runTest(sourceStream, assert, done);
    });
});