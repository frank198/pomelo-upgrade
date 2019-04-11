'use strict';
/**
 * Component for proxy.
 * Generate proxies for rpc client.
 */
const crc = require('crc');
const utils = require('../util/utils');
const events = require('../util/events');
const Client = require('pomelo-rpc-upgrade').client;
const pathUtil = require('../util/pathUtil');
const Constants = require('../util/constants');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);

class ProxyComponent
{
    constructor(app, opts)
    {
        opts = opts || {};
        // proxy default config
        // cacheMsg is deprecated, just for compatibility here.
        opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
        opts.interval = opts.interval || 30;
        opts.router = genRouteFun();
        opts.context = app;
        opts.routeContext = app;
        if (app.enabled('rpcDebugLog'))
        {
            opts.rpcDebugLog = true;
            opts.rpcLogger = require('pomelo-logger-upgrade').getLogger('rpc_debug', __filename);
        }

        this.app = app;
        this.opts = opts;
        this.client = genRpcClient(this.app, opts);
        this.app.event.on(events.ADD_SERVERS, this.addServers.bind(this));
        this.app.event.on(events.REMOVE_SERVERS, this.removeServers.bind(this));
        this.app.event.on(events.REPLACE_SERVERS, this.replaceServers.bind(this));
    }

    /**
     * Proxy component lifecycle function
     *
     * @param {function} cb
     * @return {void}
     */
    start(cb)
    {
        if (this.opts.enableRpcLog)
        {
            logger.warn('enableRpcLog is deprecated in 0.8.0, please use app.rpcFilter(pomelo.rpcFilters.rpcLog())');
        }
        const rpcBefore = this.app.get(Constants.KEYWORDS.RPC_BEFORE_FILTER);
        const rpcAfters = this.app.get(Constants.KEYWORDS.RPC_AFTER_FILTER);
        const rpcErrorHandler = this.app.get(Constants.RESERVED.RPC_ERROR_HANDLER);

        if (rpcBefore)
        {
            this.client.before(rpcBefore);
        }
        if (rpcAfters)
        {
            this.client.after(rpcAfters);
        }
        if (rpcErrorHandler)
        {
            this.client.setErrorHandler(rpcErrorHandler);
        }
        process.nextTick(cb);
    }

    /**
     * Component lifecycle callback
     *
     * @param {function} cb
     * @return {void}
     */
    afterStart(cb)
    {
        Object.defineProperty(this.app, 'rpc', {get:() =>{return this.client.proxies.user;}});
        Object.defineProperty(this.app, 'sysrpc', {get:() =>{return this.client.proxies.sys;}});
        // this.app.__defineGetter__('rpc', function()
        // {
        //     return self.client.proxies.user;
        // });
        // this.app.__defineGetter__('sysrpc', function()
        // {
        //     return self.client.proxies.sys;
        // });
        this.app.set('rpcInvoke', this.client.rpcInvoke.bind(this.client), true);
        this.client.start(cb);
    }

    /**
     * Add remote server to the rpc client.
     *
     * @param {Array} servers server info list, {id, serverType, host, port}
     */
    addServers(servers)
    {
        if (!servers || !servers.length)
        {
            return;
        }

        genProxies(this.client, this.app, servers);
        this.client.addServers(servers);
    }

    /**
     * Remove remote server from the rpc client.
     *
     * @param  {Array} ids server id list
     */
    removeServers(ids)
    {
        this.client.removeServers(ids);
    }

    /**
     * Replace remote servers from the rpc client.
     *
     * @param  {Array} ids server id list
     */
    replaceServers(servers)
    {
        if (!servers || !servers.length)
        {
            return;
        }

        // update proxies
        this.client.proxies = {};
        genProxies(this.client, this.app, servers);

        this.client.replaceServers(servers);
    }

    /**
     * Proxy for rpc client rpcInvoke.
     *
     * @param {string}   serverId remote server id
     * @param {object}   msg      rpc message: {serverType: serverType, service: serviceName, method: methodName, args: arguments}
     * @param {function} cb      callback function
     */
    rpcInvoke(serverId, msg, cb)
    {
        this.client.rpcInvoke(serverId, msg, cb);
    }
}
/**
 * Component factory function
 *
 * @param {object} app  current application context
 * @param {object} opts construct parameters
 *                      opts.router: (optional) rpc message route function, route(routeParam, msg, cb),
 *                      opts.mailBoxFactory: (optional) mail box factory instance.
 * @return {object}     component instance
 */
module.exports = function(app, opts)
{
    return new ProxyComponent(app, opts);
};

ProxyComponent.prototype.name = '__proxy__';
/**
 * Generate rpc client
 *
 * @param {object} app current application context
 * @param {object} opts constructor parameters for rpc client
 * @return {object} rpc client
 */
const genRpcClient = function(app, opts)
{
    opts.context = app;
    opts.routeContext = app;
    if (opts.rpcClient)
    {
        return opts.rpcClient.create(opts);
    }
    return Client.create(opts);
};

/**
 * Generate proxy for the server info.
 * @param  {object} client rpc client instance
 * @param  {object} app    application context
 * @param  {Array} serverInfoArr server info list
 */
const genProxies = function(client, app, serverInfoArr)
{
    let item;
    for (let i = 0, l = serverInfoArr.length; i < l; i++)
    {
        item = serverInfoArr[i];
        if (hasProxy(client, item))
        {
            continue;
        }
        client.addProxies(getProxyRecords(app, item));
    }
};

/**
 * Check a server whether has generated proxy before
 * @param  {object}  client rpc client instance
 * @param  {object}  serverInfo  server info
 * @return {boolean}        true or false
 */
const hasProxy = function(client, serverInfo)
{
    const proxy = client.proxies;
    return Boolean(proxy.sys) && Boolean(proxy.sys[serverInfo.serverType]);
};

/**
 * Get proxy path for rpc client.
 * Iterate all the remote service path and create remote path record.
 * @param {object} app current application context
 * @param {object} serverInfo server info, format: {id, serverType, host, port}
 * @return {Array}     remote path record array
 */
const getProxyRecords = function(app, serverInfo)
{
    const records = [],
            appBase = app.getBase();
    let record;
    // sys remote service path record
    if (app.isFrontend(serverInfo))
        record = pathUtil.getSysRemotePath('frontend');
    else
        record = pathUtil.getSysRemotePath('backend');
    if (record)
    {
        records.push(pathUtil.remotePathRecord('sys', serverInfo.serverType, record));
    }
    // user remote service path record
    record = pathUtil.getUserRemotePath(appBase, serverInfo.serverType);
    if (record)
    {
        records.push(pathUtil.remotePathRecord('user', serverInfo.serverType, record));
    }
    return records;
};

const genRouteFun = function()
{
    return function(session, msg, app, cb)
    {
        const routes = app.get('__routes__');

        if (!routes)
        {
            defaultRoute(session, msg, app, cb);
            return;
        }
        const type = msg.serverType,
                route = routes[type] || routes['default'];
        if (route)
        {
            route(session, msg, app, cb);
        }
        else
        {
            defaultRoute(session, msg, app, cb);
        }
    };
};

const defaultRoute = function(session, msg, app, cb)
{
    const list = app.getServersByType(msg.serverType);
    if (!list || !list.length)
    {
        cb(new Error(`can not find server info for type:${msg.serverType}`));
        return;
    }

    const uid = session ? (session.uid || '') : '';
    const index = Math.abs(crc.crc32(uid.toString())) % list.length;
    utils.invokeCallback(cb, null, list[index].id);
};
