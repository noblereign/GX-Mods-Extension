(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.Phonograph = {})));
}(this, (function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var FetchLoader = /** @class */ (function () {
        function FetchLoader(url) {
            this.url = url;
            this._cancelled = false;
        }
        FetchLoader.prototype.cancel = function () {
            this._cancelled = true;
        };
        FetchLoader.prototype.load = function (_a) {
            var _this = this;
            var onprogress = _a.onprogress, ondata = _a.ondata, onload = _a.onload, onerror = _a.onerror;
            this._cancelled = false;
            fetch(this.url)
                .then(function (response) {
                if (_this._cancelled)
                    return;
                if (!response.ok) {
                    onerror(new Error("Bad response (" + response.status + " \u2013 " + response.statusText + ")"));
                    return;
                }
                var total = +response.headers.get('content-length') || 0;
                var length = 0;
                onprogress((total ? length : 0) / total, length, total);
                if (response.body) {
                    var reader_1 = response.body.getReader();
                    var read_1 = function () {
                        if (_this._cancelled)
                            return;
                        reader_1
                            .read()
                            .then(function (chunk) {
                            if (_this._cancelled)
                                return;
                            if (chunk.done) {
                                onprogress(1, length, length);
                                onload();
                            }
                            else {
                                length += chunk.value.length;
                                ondata(chunk.value);
                                onprogress((total ? length : 0) / total, length, total);
                                read_1();
                            }
                        })
                            .catch(onerror);
                    };
                    read_1();
                }
                else {
                    // Firefox doesn't yet implement streaming
                    response
                        .arrayBuffer()
                        .then(function (arrayBuffer) {
                        if (_this._cancelled)
                            return;
                        var uint8Array = new Uint8Array(arrayBuffer);
                        ondata(uint8Array);
                        onprogress(1, uint8Array.length, uint8Array.length);
                        onload();
                    })
                        .catch(onerror);
                }
            })
                .catch(onerror);
        };
        return FetchLoader;
    }());
    var XhrLoader = /** @class */ (function () {
        function XhrLoader(url) {
            this.url = url;
            this._cancelled = false;
            this._xhr = null;
        }
        XhrLoader.prototype.cancel = function () {
            if (this._cancelled)
                return;
            this._cancelled = true;
            if (this._xhr) {
                this._xhr.abort();
                this._xhr = null;
            }
        };
        XhrLoader.prototype.load = function (_a) {
            var _this = this;
            var onprogress = _a.onprogress, ondata = _a.ondata, onload = _a.onload, onerror = _a.onerror;
            this._cancelled = false;
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.onerror = onerror;
            xhr.onload = function (e) {
                if (_this._cancelled)
                    return;
                onprogress(e.loaded / e.total, e.loaded, e.total);
                ondata(new Uint8Array(xhr.response));
                onload();
                _this._xhr = null;
            };
            xhr.onprogress = function (e) {
                if (_this._cancelled)
                    return;
                onprogress(e.loaded / e.total, e.loaded, e.total);
            };
            xhr.open('GET', this.url);
            xhr.send();
            this._xhr = xhr;
        };
        return XhrLoader;
    }());

    function slice(view, start, end) {
        if (view.slice) {
            return view.slice(start, end);
        }
        var clone = new Uint8Array(end - start);
        var p = 0;
        for (var i = start; i < end; i += 1) {
            clone[p++] = view[i];
        }
        return clone;
    }

    // http://www.mp3-tech.org/programmer/frame_header.html
    // frame header starts with 'frame sync' – eleven 1s
    function isFrameHeader(data, i, metadata) {
        if (data[i + 0] !== 255 || (data[i + 1] & 240) !== 240)
            return false;
        return ((data[i + 1] & 6) !== 0 &&
            (data[i + 2] & 240) !== 240 &&
            (data[i + 2] & 12) !== 12 &&
            (data[i + 3] & 3) !== 2 &&
            (data[i + 1] & 8) === metadata.mpegVersion &&
            (data[i + 1] & 6) === metadata.mpegLayer &&
            (data[i + 2] & 12) === metadata.sampleRate &&
            (data[i + 3] & 192) === metadata.channelMode);
    }

    // http://mpgedit.org/mpgedit/mpeg_format/mpeghdr.htm
    var bitrateLookup = {
        11: [null, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
        12: [null, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
        13: [null, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        21: [null, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
        22: [null, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
    };
    bitrateLookup[23] = bitrateLookup[22];
    function getFrameLength(data, i, metadata) {
        var mpegVersion = metadata.mpegVersion;
        var mpegLayer = metadata.mpegLayer;
        var sampleRate = metadata.sampleRate;
        var bitrateCode = (data[i + 2] & 240) >> 4;
        var bitrate = bitrateLookup["" + mpegVersion + mpegLayer][bitrateCode] * 1e3;
        var padding = (data[2] & 2) >> 1;
        var length = ~~(mpegLayer === 1
            ? (12 * bitrate / sampleRate + padding) * 4
            : 144 * bitrate / sampleRate + padding);
        return length;
    }

    var Chunk = /** @class */ (function () {
        function Chunk(_a) {
            var clip = _a.clip, raw = _a.raw, onready = _a.onready, onerror = _a.onerror;
            var _this = this;
            this.clip = clip;
            this.context = clip.context;
            this.raw = raw;
            this.extended = null;
            this.duration = null;
            this.ready = false;
            this._attached = false;
            this._callback = onready;
            this._firstByte = 0;
            var decode = function (callback, errback) {
                var buffer = slice(raw, _this._firstByte, raw.length).buffer;
                _this.context.decodeAudioData(buffer, callback, function (err) {
                    if (err)
                        return errback(err);
                    _this._firstByte += 1;
                    // filthy hack taken from http://stackoverflow.com/questions/10365335/decodeaudiodata-returning-a-null-error
                    // Thanks Safari developers, you absolute numpties
                    for (; _this._firstByte < raw.length - 1; _this._firstByte += 1) {
                        if (isFrameHeader(raw, _this._firstByte, clip._referenceHeader)) {
                            return decode(callback, errback);
                        }
                    }
                    errback(new Error("Could not decode audio buffer"));
                });
            };
            decode(function () {
                var numFrames = 0;
                for (var i = _this._firstByte; i < _this.raw.length; i += 1) {
                    if (isFrameHeader(_this.raw, i, clip._referenceHeader)) {
                        numFrames += 1;
                        var frameLength = getFrameLength(_this.raw, i, clip.metadata);
                        i += frameLength - Math.min(frameLength, 4);
                    }
                }
                _this.duration = numFrames * 1152 / clip.metadata.sampleRate;
                _this._ready();
            }, onerror);
        }
        Chunk.prototype.attach = function (nextChunk) {
            this.next = nextChunk;
            this._attached = true;
            this._ready();
        };
        Chunk.prototype.createSource = function (timeOffset, callback, errback) {
            var _this = this;
            if (!this.ready) {
                throw new Error('Something went wrong! Chunk was not ready in time for playback');
            }
            this.context.decodeAudioData(slice(this.extended, 0, this.extended.length).buffer, function (decoded) {
                if (timeOffset) {
                    var sampleOffset = ~~(timeOffset * decoded.sampleRate);
                    var numChannels = decoded.numberOfChannels;
                    var offset = _this.context.createBuffer(numChannels, decoded.length - sampleOffset, decoded.sampleRate);
                    for (var chan = 0; chan < numChannels; chan += 1) {
                        var sourceData = decoded.getChannelData(chan);
                        var targetData = offset.getChannelData(chan);
                        for (var i = 0; i < sourceData.length - sampleOffset; i += 1) {
                            targetData[i] = sourceData[i + sampleOffset];
                        }
                    }
                    decoded = offset;
                }
                var source = _this.context.createBufferSource();
                source.buffer = decoded;
                callback(source);
            }, errback);
        };
        Chunk.prototype.onready = function (callback) {
            if (this.ready) {
                setTimeout(callback);
            }
            else {
                this._callback = callback;
            }
        };
        Chunk.prototype._ready = function () {
            if (this.ready)
                return;
            if (this._attached && this.duration !== null) {
                this.ready = true;
                if (this.next) {
                    var rawLen = this.raw.length;
                    var nextLen = this.next.raw.length >> 1; // we don't need the whole thing
                    this.extended = new Uint8Array(rawLen + nextLen);
                    var p = 0;
                    for (var i = this._firstByte; i < rawLen; i += 1) {
                        this.extended[p++] = this.raw[i];
                    }
                    for (var i = 0; i < nextLen; i += 1) {
                        this.extended[p++] = this.next.raw[i];
                    }
                }
                else {
                    this.extended =
                        this._firstByte > 0
                            ? slice(this.raw, this._firstByte, this.raw.length)
                            : this.raw;
                }
                if (this._callback) {
                    this._callback();
                    this._callback = null;
                }
            }
        };
        return Chunk;
    }());

    var context;
    function getContext() {
        return (context ||
            (context = new (typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext)()));
    }

    var mpegVersionLookup = {
        0: 2,
        1: 1
    };
    var mpegLayerLookup = {
        1: 3,
        2: 2,
        3: 1
    };
    var sampleRateLookup = {
        0: 44100,
        1: 48000,
        2: 32000
    };
    var channelModeLookup = {
        0: 'stereo',
        1: 'joint stereo',
        2: 'dual channel',
        3: 'mono'
    };
    function parseMetadata(metadata) {
        var mpegVersion = mpegVersionLookup[metadata.mpegVersion >> 3];
        return {
            mpegVersion: mpegVersion,
            mpegLayer: mpegLayerLookup[metadata.mpegLayer >> 1],
            sampleRate: sampleRateLookup[metadata.sampleRate >> 2] / mpegVersion,
            channelMode: channelModeLookup[metadata.channelMode >> 6]
        };
    }

    function warn(msg) {
        console.warn(//eslint-disable-line no-console
        "%c\uD83D\uDD0A Phonograph.js %c" + msg, 'font-weight: bold;', 'font-weight: normal;');
        console.groupCollapsed(//eslint-disable-line no-console
        "%c\uD83D\uDD0A stack trace", 'font-weight: normal; color: #666;');
        var stack = new Error().stack
            .split('\n')
            .slice(2)
            .join('\n');
        console.log(//eslint-disable-line no-console
        "%c" + stack, 'display: block; font-weight: normal; color: #666;');
        console.groupEnd(); //eslint-disable-line no-console
    }

    var CHUNK_SIZE = 64 * 1024;
    var OVERLAP = 0.2;
    var PhonographError = /** @class */ (function (_super) {
        __extends(PhonographError, _super);
        function PhonographError(message, opts) {
            var _this = _super.call(this, message) || this;
            _this.phonographCode = opts.phonographCode;
            _this.url = opts.url;
            return _this;
        }
        return PhonographError;
    }(Error));
    var Clip = /** @class */ (function () {
        function Clip(_a) {
            var url = _a.url, loop = _a.loop, volume = _a.volume;
            this.callbacks = {};
            this.context = getContext();
            this.buffered = 0;
            this.length = 0;
            this.loaded = false;
            this.canplaythrough = false;
            this.playing = false;
            this.ended = false;
            this._currentTime = 0;
            this._chunks = [];
            this.url = url;
            this.loop = loop || false;
            this.loader = new (window.fetch ? FetchLoader : XhrLoader)(url);
            this._volume = volume || 1;
            this._gain = this.context.createGain();
            this._gain.gain.value = this._volume;
            this._gain.connect(this.context.destination);
            this._chunks = [];
        }
        Clip.prototype.buffer = function (bufferToCompletion) {
            var _this = this;
            if (bufferToCompletion === void 0) { bufferToCompletion = false; }
            if (!this._loadStarted) {
                this._loadStarted = true;
                var tempBuffer_1 = new Uint8Array(CHUNK_SIZE * 2);
                var p_1 = 0;
                var loadStartTime_1 = Date.now();
                var totalLoadedBytes_1 = 0;
                var checkCanplaythrough_1 = function () {
                    if (_this.canplaythrough || !_this.length)
                        return;
                    var duration = 0;
                    var bytes = 0;
                    for (var _i = 0, _a = _this._chunks; _i < _a.length; _i++) {
                        var chunk = _a[_i];
                        if (!chunk.duration)
                            break;
                        duration += chunk.duration;
                        bytes += chunk.raw.length;
                    }
                    if (!duration)
                        return;
                    var scale = _this.length / bytes;
                    var estimatedDuration = duration * scale;
                    var timeNow = Date.now();
                    var elapsed = timeNow - loadStartTime_1;
                    var bitrate = totalLoadedBytes_1 / elapsed;
                    var estimatedTimeToDownload = 1.5 * (_this.length - totalLoadedBytes_1) / bitrate / 1e3;
                    // if we have enough audio that we can start playing now
                    // and finish downloading before we run out, we've
                    // reached canplaythrough
                    var availableAudio = bytes / _this.length * estimatedDuration;
                    if (availableAudio > estimatedTimeToDownload) {
                        _this.canplaythrough = true;
                        _this._fire('canplaythrough');
                    }
                };
                var drainBuffer_1 = function () {
                    var isFirstChunk = _this._chunks.length === 0;
                    var firstByte = isFirstChunk ? 32 : 0;
                    var chunk = new Chunk({
                        clip: _this,
                        raw: slice(tempBuffer_1, firstByte, p_1),
                        onready: _this.canplaythrough ? null : checkCanplaythrough_1,
                        onerror: function (error) {
                            error.url = _this.url;
                            error.phonographCode = 'COULD_NOT_DECODE';
                            _this._fire('loaderror', error);
                        }
                    });
                    var lastChunk = _this._chunks[_this._chunks.length - 1];
                    if (lastChunk)
                        lastChunk.attach(chunk);
                    _this._chunks.push(chunk);
                    p_1 = 0;
                    return chunk;
                };
                this.loader.load({
                    onprogress: function (progress, length, total) {
                        _this.buffered = length;
                        _this.length = total;
                        _this._fire('loadprogress', { progress: progress, length: length, total: total });
                    },
                    ondata: function (uint8Array) {
                        if (!_this.metadata) {
                            for (var i = 0; i < uint8Array.length; i += 1) {
                                // determine some facts about this mp3 file from the initial header
                                if (uint8Array[i] === 255 &&
                                    (uint8Array[i + 1] & 240) === 240) {
                                    // http://www.datavoyage.com/mpgscript/mpeghdr.htm
                                    _this._referenceHeader = {
                                        mpegVersion: uint8Array[i + 1] & 8,
                                        mpegLayer: uint8Array[i + 1] & 6,
                                        sampleRate: uint8Array[i + 2] & 12,
                                        channelMode: uint8Array[i + 3] & 192
                                    };
                                    _this.metadata = parseMetadata(_this._referenceHeader);
                                    break;
                                }
                            }
                        }
                        for (var i = 0; i < uint8Array.length; i += 1) {
                            // once the buffer is large enough, wait for
                            // the next frame header then drain it
                            if (p_1 > CHUNK_SIZE + 4 &&
                                isFrameHeader(uint8Array, i, _this._referenceHeader)) {
                                drainBuffer_1();
                            }
                            // write new data to buffer
                            tempBuffer_1[p_1++] = uint8Array[i];
                        }
                        totalLoadedBytes_1 += uint8Array.length;
                    },
                    onload: function () {
                        if (p_1) {
                            var lastChunk = drainBuffer_1();
                            lastChunk.attach(null);
                            totalLoadedBytes_1 += p_1;
                        }
                        _this._chunks[0].onready(function () {
                            if (!_this.canplaythrough) {
                                _this.canplaythrough = true;
                                _this._fire('canplaythrough');
                            }
                            _this.loaded = true;
                            _this._fire('load');
                        });
                    },
                    onerror: function (error) {
                        error.url = _this.url;
                        error.phonographCode = 'COULD_NOT_LOAD';
                        _this._fire('loaderror', error);
                        _this._loadStarted = false;
                    }
                });
            }
            return new Promise(function (fulfil, reject) {
                var ready = bufferToCompletion ? _this.loaded : _this.canplaythrough;
                if (ready) {
                    fulfil();
                }
                else {
                    _this.once(bufferToCompletion ? 'load' : 'canplaythrough', fulfil);
                    _this.once('loaderror', reject);
                }
            });
        };
        Clip.prototype.clone = function () {
            return new Clone(this);
        };
        Clip.prototype.connect = function (destination, output, input) {
            if (!this._connected) {
                this._gain.disconnect();
                this._connected = true;
            }
            this._gain.connect(destination, output, input);
            return this;
        };
        Clip.prototype.disconnect = function (destination, output, input) {
            this._gain.disconnect(destination, output, input);
        };
        Clip.prototype.dispose = function () {
            if (this.playing)
                this.pause();
            if (this._loadStarted) {
                this.loader.cancel();
                this._loadStarted = false;
            }
            this._currentTime = 0;
            this.loaded = false;
            this.canplaythrough = false;
            this._chunks = [];
            this._fire('dispose');
        };
        Clip.prototype.off = function (eventName, cb) {
            var callbacks = this.callbacks[eventName];
            if (!callbacks)
                return;
            var index = callbacks.indexOf(cb);
            if (~index)
                callbacks.splice(index, 1);
        };
        Clip.prototype.on = function (eventName, cb) {
            var _this = this;
            var callbacks = this.callbacks[eventName] || (this.callbacks[eventName] = []);
            callbacks.push(cb);
            return {
                cancel: function () { return _this.off(eventName, cb); }
            };
        };
        Clip.prototype.once = function (eventName, cb) {
            var _this = this;
            var _cb = function (data) {
                cb(data);
                _this.off(eventName, _cb);
            };
            return this.on(eventName, _cb);
        };
        Clip.prototype.play = function () {
            var _this = this;
            var promise = new Promise(function (fulfil, reject) {
                _this.once('ended', fulfil);
                _this.once('loaderror', reject);
                _this.once('playbackerror', reject);
                _this.once('dispose', function () {
                    if (_this.ended)
                        return;
                    var err = new PhonographError('Clip was disposed', {
                        phonographCode: 'CLIP_WAS_DISPOSED',
                        url: _this.url
                    });
                    reject(err);
                });
            });
            if (this.playing) {
                warn("clip.play() was called on a clip that was already playing (" + this.url + ")");
            }
            else if (!this.canplaythrough) {
                warn("clip.play() was called before clip.canplaythrough === true (" + this.url + ")");
                this.buffer().then(function () { return _this._play(); });
            }
            else {
                this._play();
            }
            this.playing = true;
            this.ended = false;
            return promise;
        };
        Clip.prototype.pause = function () {
            if (!this.playing) {
                warn("clip.pause() was called on a clip that was already paused (" + this.url + ")");
                return this;
            }
            this.playing = false;
            this._currentTime =
                this._startTime + (this.context.currentTime - this._contextTimeAtStart);
            this._fire('pause');
            return this;
        };
        Object.defineProperty(Clip.prototype, "currentTime", {
            get: function () {
                if (this.playing) {
                    return (this._startTime + (this.context.currentTime - this._contextTimeAtStart));
                }
                else {
                    return this._currentTime;
                }
            },
            set: function (currentTime) {
                if (this.playing) {
                    this.pause();
                    this._currentTime = currentTime;
                    this.play();
                }
                else {
                    this._currentTime = currentTime;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Clip.prototype, "duration", {
            get: function () {
                var total = 0;
                for (var _i = 0, _a = this._chunks; _i < _a.length; _i++) {
                    var chunk = _a[_i];
                    if (!chunk.duration)
                        return null;
                    total += chunk.duration;
                }
                return total;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Clip.prototype, "paused", {
            get: function () {
                return !this.playing;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Clip.prototype, "volume", {
            get: function () {
                return this._volume;
            },
            set: function (volume) {
                this._gain.gain.value = this._volume = volume;
            },
            enumerable: true,
            configurable: true
        });
        Clip.prototype._fire = function (eventName, data) {
            var callbacks = this.callbacks[eventName];
            if (!callbacks)
                return;
            callbacks.slice().forEach(function (cb) { return cb(data); });
        };
        Clip.prototype._play = function () {
            var _this = this;
            var chunkIndex;
            var time = 0;
            for (chunkIndex = 0; chunkIndex < this._chunks.length; chunkIndex += 1) {
                var chunk_1 = this._chunks[chunkIndex];
                if (!chunk_1.duration) {
                    warn("attempted to play content that has not yet buffered " + this.url);
                    setTimeout(function () {
                        _this._play();
                    }, 100);
                    return;
                }
                var chunkEnd = time + chunk_1.duration;
                if (chunkEnd > this._currentTime)
                    break;
                time = chunkEnd;
            }
            this._startTime = this._currentTime;
            var timeOffset = this._currentTime - time;
            this._fire('play');
            var playing = true;
            var pauseListener = this.on('pause', function () {
                playing = false;
                if (previousSource)
                    previousSource.stop();
                if (currentSource)
                    currentSource.stop();
                pauseListener.cancel();
            });
            var i = chunkIndex++ % this._chunks.length;
            var chunk = this._chunks[i];
            var previousSource;
            var currentSource;
            chunk.createSource(timeOffset, function (source) {
                currentSource = source;
                _this._contextTimeAtStart = _this.context.currentTime;
                var lastStart = _this._contextTimeAtStart;
                var nextStart = _this._contextTimeAtStart + (chunk.duration - timeOffset);
                var gain = _this.context.createGain();
                gain.connect(_this._gain);
                gain.gain.setValueAtTime(0, nextStart + OVERLAP);
                source.connect(gain);
                source.start(_this.context.currentTime);
                var endGame = function () {
                    if (_this.context.currentTime >= nextStart) {
                        _this.pause()._currentTime = 0;
                        _this.ended = true;
                        _this._fire('ended');
                    }
                    else {
                        requestAnimationFrame(endGame);
                    }
                };
                var advance = function () {
                    if (!playing)
                        return;
                    var i = chunkIndex++;
                    if (_this.loop)
                        i %= _this._chunks.length;
                    chunk = _this._chunks[i];
                    if (chunk) {
                        chunk.createSource(0, function (source) {
                            previousSource = currentSource;
                            currentSource = source;
                            var gain = _this.context.createGain();
                            gain.connect(_this._gain);
                            gain.gain.setValueAtTime(0, nextStart);
                            gain.gain.setValueAtTime(1, nextStart + OVERLAP);
                            source.connect(gain);
                            source.start(nextStart);
                            lastStart = nextStart;
                            nextStart += chunk.duration;
                            gain.gain.setValueAtTime(0, nextStart + OVERLAP);
                            tick();
                        }, function (error) {
                            error.url = _this.url;
                            error.phonographCode = 'COULD_NOT_CREATE_SOURCE';
                            _this._fire('playbackerror', error);
                        });
                    }
                    else {
                        endGame();
                    }
                };
                var tick = function () {
                    if (_this.context.currentTime > lastStart) {
                        advance();
                    }
                    else {
                        setTimeout(tick, 500);
                    }
                };
                var frame = function () {
                    if (!playing)
                        return;
                    requestAnimationFrame(frame);
                    _this._fire('progress');
                };
                tick();
                frame();
            }, function (error) {
                error.url = _this.url;
                error.phonographCode = 'COULD_NOT_START_PLAYBACK';
                _this._fire('playbackerror', error);
            });
        };
        return Clip;
    }());

    var Clone = /** @class */ (function (_super) {
        __extends(Clone, _super);
        function Clone(original) {
            var _this = _super.call(this, { url: original.url }) || this;
            _this.original = original;
            return _this;
        }
        Clone.prototype.buffer = function () {
            return this.original.buffer();
        };
        Clone.prototype.clone = function () {
            return this.original.clone();
        };
        Object.defineProperty(Clone.prototype, "canplaythrough", {
            get: function () {
                return this.original.canplaythrough;
            },
            set: function (_) {
                // eslint-disable-line no-unused-vars
                // noop
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Clone.prototype, "loaded", {
            get: function () {
                return this.original.loaded;
            },
            set: function (_) {
                // eslint-disable-line no-unused-vars
                // noop
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Clone.prototype, "_chunks", {
            get: function () {
                return this.original._chunks;
            },
            set: function (_) {
                // eslint-disable-line no-unused-vars
                // noop
            },
            enumerable: true,
            configurable: true
        });
        return Clone;
    }(Clip));

    var inited;
    window.addEventListener('touchend', init, false);
    // https://paulbakaus.com/tutorials/html5/web-audio-on-ios/
    function init() {
        if (inited)
            return;
        var context = getContext();
        // create a short empty buffer
        var buffer = context.createBuffer(1, 1, 22050);
        var source = context.createBufferSource(); // needs to be `any` to avoid type errors below
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(context.currentTime);
        setTimeout(function () {
            if (!inited) {
                if (source.playbackState === source.PLAYING_STATE ||
                    source.playbackState === source.FINISHED_STATE) {
                    inited = true;
                    window.removeEventListener('touchend', init, false);
                }
            }
        });
    }

    exports.Clip = Clip;
    exports.getContext = getContext;
    exports.init = init;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=phonograph.umd.js.map
