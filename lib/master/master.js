'use strict';
const starter = require('./starter');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const crashLogger = require('pomelo-logger-upgrade').getLogger('crash_log', __filename);
const adminLogger = require('pomelo-logger-upgrade').getLogger('admin_log', __filename);
const admin = require('pomelo-admin-upgrade');
const utils = require('../util/utils');
const moduleUtil = require('../util/moduleUtil');
const Constants = require('../util/constants');

class Server {
    constructor(app, opts)
    {
        this.app = app;
        this.masterInfo = app.getMaster();
        this.registered = {};
        this.modules = [];
        opts = opts || {};

        opts.port = this.masterInfo.port;
        opts.env = this.app.get(Constants.RESERVED.ENV);
        this.closeWatcher = opts.closeWatcher;
        this.masterConsole = admin.createMasterConsole(opts);
    }

    start(cb)
    {
        moduleUtil.registerDefaultModules(true, this.app, this.closeWatcher);
        moduleUtil.loadModules(this, this.masterConsole);

        // start master console
        this.masterConsole.start(err =>
        {
            if (err)
            {
                process.exit(0);
            }
            moduleUtil.startModules(this.modules, err =>
            {
                if (err)
                {
                    utils.invokeCallback(cb, err);
                    return;
                }

                if (this.app.get(Constants.RESERVED.MODE) !== Constants.RESERVED.STAND_ALONE)
                {
                    starter.runServers(this.app);
                }
                utils.invokeCallback(cb);
            });
        });

        this.masterConsole.on('error', function(err)
        {
            if (err)
            {
                logger.error(`masterConsole encounters with error: ${err.stack}`);
            }
        });

        this.masterConsole.on('reconnect', info =>
        {
            this.app.addServers([info]);
        });

        // monitor servers disconnect event 監控失去连接
        this.masterConsole.on('disconnect', (id, type, info, reason) =>
        {
            crashLogger.info(`[${type}],[${id}],[${Date.now()}],[${reason || 'disconnect'}]`);
            let count = 0;
            const time = 0;
            let pingTimer = null;
            const server = this.app.getServerById(id);
            const stopFlags = this.app.get(Constants.RESERVED.STOP_SERVERS) || [];
            if (Boolean(server) && (server[Constants.RESERVED.AUTO_RESTART] === 'true' || server[Constants.RESERVED.RESTART_FORCE] === 'true') && stopFlags.indexOf(id) < 0)
            {
                const setTimer = time =>
                {
                    pingTimer = setTimeout(() =>
                    {
                        utils.ping(server.host, function(flag)
                        {
                            if (flag)
                            {
                                clearTimeout(pingTimer);
                                utils.checkPort(server, status =>
                                {
                                    if (status === 'error')
                                    {
                                        utils.invokeCallback(cb, new Error('Check port command executed with error.'));
                                        return;
                                    }
                                    else if (status === 'busy')
                                    {
                                        if (server[Constants.RESERVED.RESTART_FORCE])
                                        {
                                            starter.kill([info.pid], [server]);
                                        }
                                        else
                                        {
                                            utils.invokeCallback(cb, new Error('Port occupied already, check your server to add.'));
                                            return;
                                        }
                                    }
                                    setTimeout(() =>
                                    {
                                        starter.run(this.app, server, null);
                                    }, Constants.TIME.TIME_WAIT_STOP);
                                });
                            }
                            else
                            {
                                count++;
                                if (count > 3)
                                {
                                    time = Constants.TIME.TIME_WAIT_MAX_PING;
                                }
                                else
                                {
                                    time = Constants.TIME.TIME_WAIT_PING * count;
                                }
                                setTimer(time);
                            }
                        });
                    }, time);
                };
                setTimer(time);
            }
        });

        // monitor servers register event
        this.masterConsole.on('register', function(record)
        {
            starter.bindCpu(record.id, record.pid, record.host);
        });

        this.masterConsole.on('admin-log', function(log, error)
        {
            if (error)
            {
                adminLogger.error(JSON.stringify(log));
            }
            else
            {
                adminLogger.info(JSON.stringify(log));
            }
        });
    }

    stop(cb)
    {
        this.masterConsole.stop();
        process.nextTick(cb);
    }

}

module.exports = function(app, opts)
{
    return new Server(app, opts);
};
