const Emitter = require('emitter');
window.EventEmitter = Emitter;

const protocol = require('pomelo-protocol');
window.Protocol = protocol;

const protobuf = require('pomelo-protobuf');
window.protobuf = protobuf;

const pomelo = require('pomelo-jsclient-websocket');
window.pomelo = pomelo;
