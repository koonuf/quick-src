"use strict";

const Promise = require("bluebird");
const WrapperStream = require("./readable");
const VinylFile = require('vinyl');
const createQueue = require("./queue");
const utils = require("./utils");

function quickSrc(basePath, exceptionsSpec, targetBasePath, globalExcludeSpec) {
    
    let working = true;
    let canPush = false;
    let initDone = false;

    let processingQueue = createQueue();    
    let stream = new WrapperStream(onDownstreamRead);

    let globalExcludeMatchKeys = globalExcludeSpec && utils.prepareSpecItemMatchKeys(globalExcludeSpec);

    return stream;

    function onDownstreamRead() {
        canPush = true;

        if (!initDone) {
            initDone = true;
            init();

        } else if (!working) {
            processNextQueueItem();
        }
    }

    function processDirItem(specItem, specItemMatchKeys, dirItem, checkEmitRecurse) { 

        if (globalExcludeSpec && utils.findSpecSubItem(globalExcludeSpec, globalExcludeMatchKeys, dirItem.fileName, true)) { 
            return Promise.resolve();
        }
        
        let specSubItem = specItem && utils.findSpecSubItem(specItem, specItemMatchKeys, dirItem.fileName);
        let checkContinue = specItem && specItem._CHECK_CONTINUE;
        
        checkEmitRecurse = (specItem && specItem._CHECK_EMIT_RECURSE) || checkEmitRecurse;

        let isMatch = false;
        let forceEnqueue = !!checkEmitRecurse && !specSubItem;

        if (specSubItem) {
            if (specSubItem.constructor === Object) {
                forceEnqueue = true;
            }

        } else {
            isMatch = true;
        } 

        let checkPromise = checkContinue && isMatch
            ? Promise.resolve(checkContinue(dirItem.sourcePath, dirItem.targetPath))
            : Promise.resolve(true);
        
        if (checkEmitRecurse && isMatch) { 
            checkPromise = checkPromise.then((doContinue) => { 
                if (doContinue) { 
                    return checkEmitRecurse(dirItem.sourcePath, dirItem.targetPath);
                }
            });
        }

        return checkPromise.then((doContinue) => {

            if (!doContinue) { 
                return;
            }
            
            if (isMatch || forceEnqueue) {
                processingQueue.enqueue({
                    dirItem,
                    isMatch,
                    specItem: specSubItem && specSubItem.constructor === Object ? specSubItem : null,
                    checkEmitRecurse
                });
            }
        });
    }
    
    function processDir(sourceDir, targetDir, specItem, checkEmitRecurse) {

        return utils.getDirItems(sourceDir, targetDir).then((dirItems) => {

            let specItemMatchKeys = specItem && utils.prepareSpecItemMatchKeys(specItem);
    
            return Promise.reduce(
                dirItems,
                (t, dirItem) => processDirItem(specItem, specItemMatchKeys, dirItem, checkEmitRecurse), 0);
        });
    }
    
    function processNextQueueItem() {
    
        working = true;
    
        let qi = processingQueue.dequeue();
            
        if (qi) {
    
            let processingPromise = Promise.resolve();
    
            if (qi.dirItem.sourceStat.isDirectory()) {
                processingPromise = processDir(qi.dirItem.sourcePath, qi.dirItem.targetPath, qi.specItem, qi.checkEmitRecurse);

            } else if (qi.isMatch && qi.dirItem.sourceStat.isFile()) { 
                processingPromise = utils.readFileIntoQueueItem(qi);   
            }
    
            processingPromise.then(() => {
                if (!qi.isMatch || emit(qi)) {
                    processNextQueueItem();
                }
            }).catch(onError);

        } else {
            emit(null);
        }
    }
    
    function emit(queueItem) {

        if (!queueItem) {
            stream.push(null);
            return canPush = false;
        }
    
        let obj = {
            base: basePath,
            path: queueItem.dirItem.sourcePath,
        };
    
        let file = new VinylFile(obj);
        file.stat = queueItem.dirItem.sourceStat;

        if (queueItem.contents) { 
            file.contents = queueItem.contents;
        }
    
        canPush = stream.push(file);
    
        if (!canPush) {
            working = false;
        }
    
        return canPush;
    }

    function onError(err) { 
        
        process.nextTick(function () {
            stream.emit('error', err);
        });

        canPush = false;
        processingQueue = null;
        working = true;
    }
    
    function init() {
        processDir(basePath, targetBasePath, exceptionsSpec)
            .then(processNextQueueItem)
            .catch(onError);
    }
}
    
module.exports = quickSrc;