'use strict';
/**
 * Component for remote service.
 * Load remote service and add to global context.
 */
const fs = require('fs');
const pathUtil = require('../util/pathUtil');
const RemoteServer = require('pomelo-rpc-upgrade').server;
class RemoteComponent
{
    constructor(app, opts)
    {
        opts = opts || {};

        // cacheMsg is deprecated, just for compatibility here.
        opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
        opts.interval = opts.interval || 30;
        if (app.enabled('rpcDebugLog'))
        {
            opts.rpcDebugLog = true;
            opts.rpcLogger = require('pomelo-logger-upgrade').getLogger('rpc_debug', __filename);
        }
        this.app = app;
        this.opts = opts;
    }

    /**
     * Remote component lifecycle function
     *
     * @param {function} cb
     * @return {void}
     */
    start(cb)
    {
        this.opts.port = this.app.getCurServer().port;

        const paths = [];
        // master server should not come here
        const role = this.app.isFrontend() ? 'frontend' : 'backend';
        const sysPath = pathUtil.getSysRemotePath(role),
                serverType = this.app.getServerType();
        if (fs.existsSync(sysPath))
        {
            paths.push(pathUtil.remotePathRecord('sys', serverType, sysPath));
        }
        const userPath = pathUtil.getUserRemotePath(this.app.getBase(), serverType);
        if (fs.existsSync(userPath))
        {
            paths.push(pathUtil.remotePathRecord('user', serverType, userPath));
        }
        this.opts.paths = paths;
        this.opts.context = this.app;
        if (this.opts.rpcServer)
            this.remote = this.opts.rpcServer.create(this.opts);
        else
            this.remote = RemoteServer.create(this.opts);

        this.remote.start();
        process.nextTick(cb);
    }

    /**
     * Remote component lifecycle function
     * @param {boolean}  force whether stop the component immediately
     * @param {function}  cb
     * @return {void}
     */
    stop(force, cb)
    {
        this.remote.stop(force);
        process.nextTick(cb);
    }
}

/**
 * Remote component factory function
 *
 * @param {object} app  current application context
 * @param {object} opts construct parameters
 *                       opts.acceptorFactory {object}: acceptorFactory.create(opts, cb)
 * @return {object}     remote component instances
 */
module.exports = function(app, opts)
{
    return new RemoteComponent(app, opts);
};

RemoteComponent.prototype.name = '__remote__';
