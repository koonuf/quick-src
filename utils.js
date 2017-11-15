"use strict";

const Promise = require("bluebird");
const fs = require("fs");
const fsa = Promise.promisifyAll(fs);
const path = require("path");
const minimatch = require("minimatch");
const removeBomBuffer = require('remove-bom-buffer');

function findSpecSubItem(specItem, specItemMatchKeys, fileName, returnFirst) { 
    
    let exactMatchSubItem = specItem["/" + fileName];

    if (exactMatchSubItem || exactMatchSubItem === false) { 
        return exactMatchSubItem;
    }

    let value = undefined;
    let longestMatchKeyLength = 0;   

    for (let specItemMatchKey of specItemMatchKeys) { 

        if (specItemMatchKey.key.length > longestMatchKeyLength && specItemMatchKey.regEx.test(fileName)) { 
            value = specItem[specItemMatchKey.key];
            longestMatchKeyLength = specItemMatchKey.key.length;

            if (returnFirst) { 
                return value;
            }
        }
    }

    return value;
}

function prepareSpecItemMatchKeys(specItem) { 
    let allKeys = Object.keys(specItem);

    let res = [];

    for (let key of allKeys) { 
        if (key.startsWith("/") && key.indexOf("*") >= 0) { 
            res.push({
                key,
                regEx: minimatch.makeRe(key.substr(1))
            });
        }
    }

    return res;
}

function prepareExceptionsList(exceptions) { 
    if (exceptions && exceptions.length) { 
        let result = new Array
    }
}

function mapDirItem(sourceDir, targetDir, fileName) {
    
    let sourcePath = path.join(sourceDir, fileName);
    let targetPath = targetDir ? path.join(targetDir, fileName) : null;
    
    return fsa.statAsync(sourcePath).then((sourceStat) => { 
        return {
            fileName,
            sourceStat,
            sourcePath,
            targetPath
        };
    });
}
    
function isValidFilename(fileName) {
    return fileName && !fileName.startsWith(".");
}
    
function getDirItems(sourceDir, targetDir) {
    
    return fsa.readdirAsync(sourceDir).then((sourceFilenames) => {
        sourceFilenames = sourceFilenames.filter(isValidFilename);
        return Promise.map(sourceFilenames, fileName => mapDirItem(sourceDir, targetDir, fileName));
    });
}

function readFileIntoQueueItem(queueItem) { 
    return fsa.readFileAsync(queueItem.dirItem.sourcePath).then(data => queueItem.contents = removeBomBuffer(data));
}

module.exports = {
    readFileIntoQueueItem,
    getDirItems,
    prepareSpecItemMatchKeys,
    findSpecSubItem
};