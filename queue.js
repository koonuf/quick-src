"use strict";

const MIN_PACK_SIZE = 100;

function createQueue() {
    
    let inst = {},
        offset = 0,
        elements = [];
    
    function packIfNeeded() { 

        if (offset < MIN_PACK_SIZE) { 
            return;
        }

        if (offset > elements.length / 2) {
            elements = elements.slice(offset);
            offset = 0;
        }    
    }
    
    inst.isEmpty = function() {
        return elements.length === offset;
    };

    inst.length = function() {
        return elements.length - offset;
    };

    inst.enqueue = function(el) {
        elements.push(el);
    };

    inst.dequeue = function () {
        
        if (this.isEmpty()) {
            return null;
        }

        let first = elements[offset++];
        packIfNeeded();

        return first;
    };

    return inst;
};

module.exports = createQueue;