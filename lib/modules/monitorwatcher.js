'use strict';
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const utils = require('../util/utils');
const events = require('../util/events');
const Constants = require('../util/constants');

class MonitorWatcher
{
    constructor(opts, consoleService)
    {
        this.app = opts.app;
        this.service = consoleService;
        this.id = this.app.getServerId();
        this.app.event.on(events.START_SERVER, finishStart.bind(null, this));
    }

    start(cb)
    {
        const msg = {
            action : 'subscribe',
            id     : this.id
        };
        this.service.agent.request(Constants.KEYWORDS.MASTER_WATCHER, msg, (err, servers) =>
        {
            if (err)
            {
                logger.error('subscribeRequest request to master with error: %j', err.stack);
                utils.invokeCallback(cb, err);
            }
            const res = [];
            for (const serverId in servers)
            {
                res.push(servers[serverId]);
            }
            this.addServers(res);
            utils.invokeCallback(cb);
        });
    }

    monitorHandler(agent, msg, cb)
    {
        if (!msg || !msg.action)
        {
            return;
        }
        if (!this[msg.action])
        {
            logger.info('monitorWatcher unknown action: %j', msg.action);
            return;
        }
        this[msg.action](agent, msg, cb);
    }

    addServer(agent, msg, cb)
    {
        logger.debug('[%s] receive addServer signal: %j', this.app.serverId, msg);
        if (!msg || !msg.server)
        {
            logger.warn('monitorWatcher addServer receive empty message: %j', msg);
            utils.invokeCallback(cb, Constants.SIGNAL.FAIL);
            return;
        }
        this.addServers([msg.server]);
        utils.invokeCallback(cb, Constants.SIGNAL.OK);
    }

    removeServer(agent, msg, cb)
    {
        logger.debug('%s receive removeServer signal: %j', this.app.serverId, msg);
        if (!msg || !msg.id)
        {
            logger.warn('monitorWatcher removeServer receive empty message: %j', msg);
            utils.invokeCallback(cb, Constants.SIGNAL.FAIL);
            return;
        }
        if (msg.id)
        {
            this.app.removeServers([msg.id]);
        }
        utils.invokeCallback(cb, Constants.SIGNAL.OK);
    }

    replaceServer(agent, msg, cb)
    {
        logger.debug('%s receive replaceServer signal: %j', this.app.serverId, msg);
        if (!msg || !msg.servers)
        {
            logger.warn('monitorWatcher replaceServer receive empty message: %j', msg);
            utils.invokeCallback(cb, Constants.SIGNAL.FAIL);
            return;
        }
        if (msg.servers)
            this.app.replaceServers(msg.servers);
        utils.invokeCallback(cb, Constants.SIGNAL.OK);
    }

    startOver(agent, msg, cb)
    {
        const fun = this.app.lifecycleCbs[Constants.LIFECYCLE.AFTER_STARTALL];
        if (fun)
        {
            fun.call(null, this.app);
        }
        this.app.event.emit(events.START_ALL);
        utils.invokeCallback(cb, Constants.SIGNAL.OK);
    }

    addServers(servers)
    {
        if (!servers || !servers.length)
        {
            return;
        }
        this.app.addServers(servers);
    }
}


module.exports = function(opts, consoleService)
{
    return new MonitorWatcher(opts, consoleService);
};

module.exports.moduleId = Constants.KEYWORDS.MONITOR_WATCHER;

// ----------------- bind methods -------------------------

const finishStart = function(self, id)
{
    const msg = {
        action : 'record',
        id     : id
    };
    self.service.agent.notify(Constants.KEYWORDS.MASTER_WATCHER, msg);
};
