'use strict';
const DEFAULT_PREFIX = 'POMELO:CHANNEL';
const utils = require('../../lib/util/utils');

const MockManager = function(app, opts) {
    this.app = app;
    this.opts = opts || {};
    this.prefix = opts.prefix || DEFAULT_PREFIX;
};

module.exports = MockManager;

MockManager.prototype.start = function(cb) {
    this.usersMap = {};
    utils.invokeCallback(cb);
};

MockManager.prototype.stop = function(force, cb) {
    this.usersMap = null;
    utils.invokeCallback(cb);
};

MockManager.prototype.add = function(name, uid, sid, cb) {
    const key = genKey(this, name, sid);
    if (!this.usersMap[key]) {
        this.usersMap[key] = [];
    }
    this.usersMap[key].push(uid);
    utils.invokeCallback(cb);
};

MockManager.prototype.leave = function(name, uid, sid, cb) {
    const key = genKey(this, name, sid);
    const res = deleteFrom(uid, this.usersMap[key]);
    if (this.usersMap[key] && this.usersMap[key].length === 0) {
        delete this.usersMap[sid];
    }
    utils.invokeCallback(cb);
};

MockManager.prototype.getMembersBySid = function(name, sid, cb) {
    const key = genKey(this, name, sid);
    if (!this.usersMap[key])
        this.usersMap[key] = [];
    utils.invokeCallback(cb, null, this.usersMap[key]);
};

MockManager.prototype.destroyChannel = function(name, cb) {
    const servers = this.app.getServers();
    let server, removes = [];
    for (const sid in servers) {
        server = servers[sid];
        if (this.app.isFrontend(server)) {
            removes.push(genKey(this, name, sid));
        }
    }

    if (removes.length === 0) {
        utils.invokeCallback(cb);
        return;
    }

    for (let i = 0; i < removes.length; i++) {
        delete this.usersMap[removes[i]];
    }
    utils.invokeCallback(cb);
};

var genKey = function(self, name, sid) {
    return self.prefix + ':' + name + ':' + sid;
};

var deleteFrom = function(uid, group) {
    if (!group) {
        return true;
    }

    for (let i = 0, l = group.length; i < l; i++) {
        if (group[i] === uid) {
            group.splice(i, 1);
            return true;
        }
    }
    return false;
};
