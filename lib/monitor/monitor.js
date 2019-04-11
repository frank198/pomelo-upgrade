'use strict';
/**
 * Component for monitor.
 * Load and start monitor client.
 */
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const admin = require('pomelo-admin-upgrade');
const moduleUtil = require('../util/moduleUtil');
const utils = require('../util/utils');
const Constants = require('../util/constants');

const Monitor = function(app, opts)
{
    opts = opts || {};
    this.app = app;
    this.serverInfo = app.getCurServer();
    this.masterInfo = app.getMaster();
    this.modules = [];
    this.closeWatcher = opts.closeWatcher;

    this.monitorConsole = admin.createMonitorConsole({
        id         : this.serverInfo.id,
        type       : this.app.getServerType(),
        host       : this.masterInfo.host,
        port       : this.masterInfo.port,
        info       : this.serverInfo,
        env        : this.app.get(Constants.RESERVED.ENV),
        authServer : this.app.get('adminAuthServerMonitor') // auth server function
    });
};

module.exports = Monitor;

Monitor.prototype.start = function(cb)
{
    moduleUtil.registerDefaultModules(false, this.app, this.closeWatcher);
    this.startConsole(cb);
};

Monitor.prototype.startConsole = function(cb)
{
    moduleUtil.loadModules(this, this.monitorConsole);

    this.monitorConsole.start(err =>
    {
        if (err)
        {
            utils.invokeCallback(cb, err);
            return;
        }
        moduleUtil.startModules(this.modules, function(err)
        {
            utils.invokeCallback(cb, err);
        });
    });

    this.monitorConsole.on('error', function(err)
    {
        if (err)
        {
            logger.error('monitorConsole encounters with error: %j', err.stack);
        }
    });
};

Monitor.prototype.stop = function(cb)
{
    this.monitorConsole.stop();
    this.modules = [];
    process.nextTick(function()
    {
        utils.invokeCallback(cb);
    });
};

// monitor reconnect to master
Monitor.prototype.reconnect = function(masterInfo)
{
    this.stop(() =>
    {
        this.monitorConsole = admin.createMonitorConsole({
            id   : this.serverInfo.id,
            type : this.app.getServerType(),
            host : masterInfo.host,
            port : masterInfo.port,
            info : this.serverInfo,
            env  : this.app.get(Constants.RESERVED.ENV)
        });
        this.startConsole(() =>
        {
            logger.info('restart modules for server : %j finish.', this.app.serverId);
        });
    });
};
