'use strict';
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const countDownLatch = require('../util/countDownLatch');
const utils = require('../util/utils');
const Constants = require('../util/constants');
const starter = require('../master/starter');
const exec = require('child_process').exec;

class ConsoleModules
{
    constructor(opts)
    {
        opts = opts || {};
        this.app = opts.app;
        this.starter = opts.starter;
    }

    monitorHandler(agent, msg, cb)
    {
        const serverId = agent.id;
        switch (msg.signal)
        {
            case 'stop':
                if (agent.type === Constants.RESERVED.MASTER)
                {
                    return;
                }
                this.app.stop(true);
                break;
            case 'list':
                {
                    const serverType = agent.type;
                    const pid = process.pid;
                    const heapUsed = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
                    const rss = (process.memoryUsage().rss / (1024 * 1024)).toFixed(2);
                    const heapTotal = (process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2);
                    utils.invokeCallback(cb, {
                        serverId : serverId,
                        body     : {
                            serverId   : serverId,
                            serverType : serverType,
                            pid        : pid,
                            rss        : rss,
                            heapTotal  : heapTotal,
                            heapUsed   : heapUsed,
                            uptime     : (process.uptime() / 60).toFixed(2)
                        }
                    });
                }
                break;
            case 'kill':
                utils.invokeCallback(cb, serverId);
                if (agent.type !== 'master')
                {
                    setTimeout(function()
                    {
                        process.exit(-1);
                    }, Constants.TIME.TIME_WAIT_MONITOR_KILL);
                }
                break;
            case 'addCron':
                this.app.addCron([msg.cron]);
                break;
            case 'removeCron':
                this.app.removeCron([msg.cron]);
                break;
            case 'updateCron':
                this.app.updateCron([msg.cron]);
                break;
            case 'blacklist':
                if (this.app.isFrontend())
                {
                    const command = msg.command || 'add';
                    const connector = this.app.components.__connector__;
                    switch (command)
                    {
                        case 'add':
                            connector.blacklist = connector.blacklist.concat(msg.blacklist);
                            connector.blacklist = Array.from(new Set(connector.blacklist));
                            break;
                        case 'del':
                            if (!Array.isArray(msg.blacklist))
                                msg.blacklist = [msg.blacklist];
                            connector.blacklist = connector.blacklist.filter(v => {return !msg.blacklist.includes(v);});
                            break;
                    }
                }
                break;
            case 'restart':
                if (agent.type === Constants.RESERVED.MASTER)
                {
                    return;
                }
                const server = this.app.get(Constants.RESERVED.CURRENT_SERVER);
                utils.invokeCallback(cb, server);
                process.nextTick(() =>
                {
                    this.app.stop(true);
                });
                break;
            default:
                logger.error('receive error signal: %j', msg);
                break;
        }
    }

    clientHandler(agent, msg, cb)
    {
        const app = this.app;
        switch (msg.signal)
        {
            case 'kill':
                kill(app, agent, msg, cb);
                break;
            case 'stop':
                stop(app, agent, msg, cb);
                break;
            case 'list':
                list(agent, msg, cb);
                break;
            case 'add':
                add(app, msg, cb);
                break;
            case 'addCron':
                addCron(app, agent, msg, cb);
                break;
            case 'removeCron':
                removeCron(app, agent, msg, cb);
                break;
            case 'updateCron':
                updateCron(app, agent, msg, cb);
                break;
            case 'blacklist':
                blacklist(agent, msg, cb);
                break;
            case 'restart':
                restart(app, agent, msg, cb);
                break;
            default:
                utils.invokeCallback(cb, new Error('The command cannot be recognized, please check.'), null);
                break;
        }
    }
}



module.exports = function(opts)
{
    return new ConsoleModules(opts);
};

module.exports.moduleId = '__console__';



const kill = function(app, agent, msg, cb)
{
    let sid, record;
    const serverIds = [];
    const count = utils.size(agent.idMap);
    const latch = countDownLatch.createCountDownLatch(count, {timeout: Constants.TIME.TIME_WAIT_MASTER_KILL}, function(isTimeout)
    {
        if (!isTimeout)
        {
            utils.invokeCallback(cb, null, {code: 'ok'});
        }
        else
        {
            utils.invokeCallback(cb, null, {code      : 'remained',
                serverIds : serverIds});
        }
        setTimeout(function()
        {
            process.exit(-1);
        }, Constants.TIME.TIME_WAIT_MONITOR_KILL);
    });

    const agentRequestCallback = function(msg)
    {
        for (let i = 0; i < serverIds.length; ++i)
        {
            if (serverIds[i] === msg)
            {
                serverIds.splice(i, 1);
                latch.done();
                break;
            }
        }
    };

    for (sid in agent.idMap)
    {
        record = agent.idMap[sid];
        serverIds.push(record.id);
        agent.request(record.id, module.exports.moduleId, {signal: msg.signal}, agentRequestCallback);
    }
};

const stop = function(app, agent, msg, cb)
{
    const serverIds = msg.ids;
    if (serverIds.length)
    {
        const servers = app.getServers();
        app.set(Constants.RESERVED.STOP_SERVERS, serverIds);
        for (let i = 0; i < serverIds.length; i++)
        {
            const serverId = serverIds[i];
            if (!servers[serverId])
            {
                utils.invokeCallback(cb, new Error('Cannot find the server to stop.'), null);
            }
            else
            {
                agent.notifyById(serverId, module.exports.moduleId, {signal: msg.signal});
            }
        }
        utils.invokeCallback(cb, null, {status: 'part'});
    }
    else
    {
        const serverIds = Object.keys(app.getServers());
        app.set(Constants.RESERVED.STOP_SERVERS, serverIds);
        agent.notifyAll(module.exports.moduleId, {signal: msg.signal});
        setTimeout(function()
        {
            app.stop(true);
            utils.invokeCallback(cb, null, {status: 'all'});
        }, Constants.TIME.TIME_WAIT_STOP);
    }
};

const restart = function(app, agent, msg, cb)
{
    let successFlag;
    const successIds = [];
    const serverIds = msg.ids;
    const type = msg.type;
    let servers;
    if (!serverIds.length && Boolean(type))
    {
        servers = app.getServersByType(type);
        if (!servers)
        {
            utils.invokeCallback(cb, new Error(`restart servers with unknown server type: ${type}`));
            return;
        }
        for (let i = 0; i < servers.length; i++)
        {
            serverIds.push(servers[i].id);
        }
    }
    else if (!serverIds.length)
    {
        servers = app.getServers();
        for (const key in servers)
        {
            serverIds.push(key);
        }
    }
    const count = serverIds.length;
    const latch = countDownLatch.createCountDownLatch(count, {timeout: Constants.TIME.TIME_WAIT_COUNTDOWN}, function()
    {
        if (!successFlag)
        {
            utils.invokeCallback(cb, new Error('all servers start failed.'));
            return;
        }
        utils.invokeCallback(cb, null, utils.arrayDiff(serverIds, successIds));
    });

    const request = function(id)
    {
        return (function()
        {
            agent.request(id, module.exports.moduleId, {signal: msg.signal}, function(msg)
            {
                if (!utils.size(msg))
                {
                    latch.done();
                    return;
                }
                setTimeout(function()
                {
                    runServer(app, msg, function(err, status)
                    {
                        if (err)
                        {
                            logger.error(`restart ${id} failed.`);
                        }
                        else
                        {
                            successIds.push(id);
                            successFlag = true;
                        }
                        latch.done();
                    });
                }, Constants.TIME.TIME_WAIT_RESTART);
            });
        })();
    };

    for (let j = 0; j < serverIds.length; j++)
    {
        request(serverIds[j]);
    }
};

const list = function(agent, msg, cb)
{
    let sid, record;
    const serverInfo = {};
    const count = utils.size(agent.idMap);
    const latch = countDownLatch.createCountDownLatch(count, {timeout: Constants.TIME.TIME_WAIT_COUNTDOWN}, function()
    {
        utils.invokeCallback(cb, null, {msg: serverInfo});
    });

    const callback = function(msg)
    {
        serverInfo[msg.serverId] = msg.body;
        latch.done();
    };
    for (sid in agent.idMap)
    {
        record = agent.idMap[sid];
        agent.request(record.id, module.exports.moduleId, {signal: msg.signal}, callback);
    }
};

const add = function(app, msg, cb)
{
    if (checkCluster(msg))
    {
        startCluster(app, msg, cb);
    }
    else
    {
        startServer(app, msg, cb);
    }
    reset(ServerInfo);
};

const addCron = function(app, agent, msg, cb)
{
    const cron = parseArgs(msg, CronInfo, cb);
    sendCronInfo(cron, agent, msg, CronInfo, cb);
};

const removeCron = function(app, agent, msg, cb)
{
    const cron = parseArgs(msg, RemoveCron, cb);
    sendCronInfo(cron, agent, msg, RemoveCron, cb);
};

const updateCron = function(app, agent, msg, cb)
{
    const cron = parseArgs(msg, CronInfo, cb);
    sendCronInfo(cron, agent, msg, CronInfo, cb);
};

const blacklist = function(agent, msg, cb)
{
    const ips = msg.args;
    for (let i = 0; i < ips.length; i++)
    {
        if (!(new RegExp(/(\d+)\.(\d+)\.(\d+)\.(\d+)/g).test(ips[i])))
        {
            utils.invokeCallback(cb, new Error(`blacklist ip: ${ips[i]} is error format.`), null);
            return;
        }
    }
    agent.notifyAll(module.exports.moduleId, {signal    : msg.signal,
        blacklist : msg.args});
    process.nextTick(function()
    {
        cb(null, {status: 'ok'});
    });
};

const checkPort = function(server, cb)
{
    if (!server.port && !server.clientPort)
    {
        utils.invokeCallback(cb, 'leisure');
        return;
    }

    let p = server.port || server.clientPort;
    const host = server.host;
    let cmd = 'netstat -tln | grep ';
    if (!utils.isLocal(host))
    {
        cmd = `ssh ${host} ${cmd}`;
    }

    exec(cmd + p, function(err, stdout, stderr)
    {
        if (stdout || stderr)
        {
            utils.invokeCallback(cb, 'busy');
        }
        else
        {
            p = server.clientPort;
            exec(cmd + p, function(err, stdout, stderr)
            {
                if (stdout || stderr)
                {
                    utils.invokeCallback(cb, 'busy');
                }
                else
                {
                    utils.invokeCallback(cb, 'leisure');
                }
            });
        }
    });
};

const parseArgs = function(msg, info, cb)
{
    const rs = {};
    const args = msg.args;
    for (let i = 0; i < args.length; i++)
    {
        if (args[i].indexOf('=') < 0)
        {
            cb(new Error('Error server parameters format.'), null);
            return;
        }
        const pairs = args[i].split('=');
        const key = pairs[0];
        if (info[key])
        {
            info[key] = 1;
        }
        rs[pairs[0]] = pairs[1];
    }
    return rs;
};

const sendCronInfo = function(cron, agent, msg, info, cb)
{
    if (isReady(info) && (cron.serverId || cron.serverType))
    {
        if (cron.serverId)
        {
            agent.notifyById(cron.serverId, module.exports.moduleId, {signal : msg.signal,
                cron   : cron});
        }
        else
        {
            agent.notifyByType(cron.serverType, module.exports.moduleId, {signal : msg.signal,
                cron   : cron});
        }
        process.nextTick(function()
        {
            cb(null, {status: 'ok'});
        });
    }
    else
    {
        cb(new Error('Miss necessary server parameters.'), null);
    }
    reset(info);
};

const startServer = function(app, msg, cb)
{
    const server = parseArgs(msg, ServerInfo, cb);
    if (isReady(ServerInfo))
    {
        runServer(app, server, cb);
    }
    else
    {
        cb(new Error('Miss necessary server parameters.'), null);
    }
};

const runServer = function(app, server, cb)
{
    checkPort(server, function(status)
    {
        if (status === 'busy')
        {
            utils.invokeCallback(cb, new Error('Port occupied already, check your server to add.'));
        }
        else
        {
            starter.run(app, server, function(err)
            {
                if (err)
                {
                    utils.invokeCallback(cb, new Error(err), null);
                    return;
                }
            });
            process.nextTick(function()
            {
                utils.invokeCallback(cb, null, {status: 'ok'});
            });
        }
    });
};

const startCluster = function(app, msg, cb)
{
    const serverMap = {};
    const fails = [];
    let successFlag;
    const serverInfo = parseArgs(msg, ClusterInfo, cb);
    utils.loadCluster(app, serverInfo, serverMap);
    const count = utils.size(serverMap);
    const latch = countDownLatch.createCountDownLatch(count, function()
    {
        if (!successFlag)
        {
            utils.invokeCallback(cb, new Error('all servers start failed.'));
            return;
        }
        utils.invokeCallback(cb, null, fails);
    });

    const start = function(server)
    {
        return (function()
        {
            checkPort(server, function(status)
            {
                if (status === 'busy')
                {
                    fails.push(server);
                    latch.done();
                }
                else
                {
                    starter.run(app, server, function(err)
                    {
                        if (err)
                        {
                            fails.push(server);
                            latch.done();
                        }
                    });
                    process.nextTick(function()
                    {
                        successFlag = true;
                        latch.done();
                    });
                }
            });
        })();
    };
    for (const key in serverMap)
    {
        const server = serverMap[key];
        start(server);
    }
};

const checkCluster = function(msg)
{
    let flag = false;
    const args = msg.args;
    for (let i = 0; i < args.length; i++)
    {
        if (utils.startsWith(args[i], Constants.RESERVED.CLUSTER_COUNT))
        {
            flag = true;
        }
    }
    return flag;
};

const isReady = function(info)
{
    for (const key in info)
    {
        if (info[key])
        {
            return false;
        }
    }
    return true;
};

const reset = function(info)
{
    for (const key in info)
    {
        info[key] = 0;
    }
};

const ServerInfo = {
    host       : 0,
    port       : 0,
    id         : 0,
    serverType : 0
};

const CronInfo = {
    id     : 0,
    action : 0,
    time   : 0
};

const RemoveCron = {
    id : 0
};

const ClusterInfo = {
    host         : 0,
    port         : 0,
    clusterCount : 0
};
