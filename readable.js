"use strict";

const Readable = require('stream').Readable;
const inherits = require('util').inherits;

function WrapperStream(onReadCallback) {

    Readable.call(this, {
        objectMode: true,
        highWaterMark: 16,
    });

    this.onReadWrappedCallback = onReadCallback;
}

inherits(WrapperStream, Readable);

WrapperStream.prototype._read = function () {
    this.onReadWrappedCallback();
};

WrapperStream.prototype._destroy = function () {
    this.onReadWrappedCallback = null;
};

module.exports = WrapperStream;