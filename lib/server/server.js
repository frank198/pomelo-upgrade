'use strict';
/**
 * Implementation of server component.
 * Init and start server instance.
 */

const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const fs = require('fs');
const path = require('path');
const pathUtil = require('../util/pathUtil');
const Loader = require('pomelo-loader-upgrade');
const utils = require('../util/utils');
const schedule = require('node-schedule');
const events = require('../util/events');
const Constants = require('../util/constants');
const FilterService = require('../common/service/filterService');
const HandlerService = require('../common/service/handlerService');

const ST_INITED = 0; // server inited
const ST_STARTED = 1; // server started
const ST_STOPED = 2; // server stoped

class Server {
    constructor(app, opts)
    {
        this.opts = opts || {};
        this.app = app;
        this.globalFilterService = null;
        this.filterService = null;
        this.handlerService = null;
        this.crons = [];
        this.jobs = {};
        this.state = ST_INITED;

        app.event.on(events.ADD_CRONS, this.addCron.bind(this));
        app.event.on(events.REMOVE_CRONS, this.removeCron.bind(this));
        app.event.on(events.UPDATE_CRONS, this.updateCron.bind(this));
    }

    /**
     * Server lifecycle callback
     */
    start()
    {
        if (this.state > ST_INITED)
        {
            return;
        }

        this.globalFilterService = initFilter(true, this.app);
        this.filterService = initFilter(false, this.app);
        this.handlerService = initHandler(this.app, this.opts);
        this.cronHandlers = loadCronHandlers(this.app);
        loadCronConfig(this, this.app);
        this.state = ST_STARTED;
    }

    afterStart()
    {
        scheduleCron(this, this.crons);
    }

    /**
     * Stop server
     */
    stop()
    {
        this.state = ST_STOPED;
    }

    /**
     * Global handler.
     *
     * @param  {object} msg request message
     * @param  {object} session session object
     * @param  {callback} cb function
     */
    globalHandle(msg, session, cb)
    {
        if (this.state !== ST_STARTED)
        {
            utils.invokeCallback(cb, new Error('server not started'));
            return;
        }

        const routeRecord = parseRoute(msg.route);
        if (!routeRecord)
        {
            utils.invokeCallback(cb, new Error('meet unknown route message %j', msg.route));
            return;
        }


        if (routeRecord.method === 'constructor') {
            logger.warn('attack session:', session, msg);
            this.app.sessionService.kickBySessionId(session.id, 'attack');
            return;
        }
        const self = this;
        const dispatch = function(err, resp, opts)
        {
            if (err)
            {
                handleError(true, self, err, msg, session, resp, opts, function(err, resp, opts)
                {
                    response(true, self, err, msg, session, resp, opts, cb);
                });
                return;
            }

            if (self.app.getServerType() !== routeRecord.serverType)
            {
                doForward(self.app, msg, session, routeRecord, function(err, resp, opts)
                {
                    response(true, self, err, msg, session, resp, opts, cb);
                });
            }
            else
            {
                doHandle(self, msg, session, routeRecord, function(err, resp, opts)
                {
                    response(true, self, err, msg, session, resp, opts, cb);
                });
            }
        };
        beforeFilter(true, self, msg, session, dispatch);
    }

    /**
     * Handle request
     */
    handle(msg, session, cb)
    {
        if (this.state !== ST_STARTED)
        {
            cb(new Error('server not started'));
            return;
        }

        const routeRecord = parseRoute(msg.route);
        doHandle(this, msg, session, routeRecord, cb);
    }

    /**
     * Add cron List at runtime.
     *
     * @param {Array} cronList would be added in application
     */
    addCron(cronList)
    {
        this.cronHandlers = loadCronHandlers(this.app);
        if (!this.cronHandlers)
            return `${this.app.serverType} 没有 Cron 文件夹， 或者 Cron 没有内容`;
        for (let i = 0, l = cronList.length; i < l; i++)
        {
            const cron = cronList[i];
            checkAndAdd(cron, this.crons, this);
        }
        scheduleCron(this, cronList);
    }

    /**
     * Remove crons at runtime.
     *
     * @param {Array} cronList would be removed in application
     */
    removeCron(cronList)
    {
        for (let i = 0, l = cronList.length; i < l; i++)
        {
            const cron = cronList[i];
            const id = cron.id;
            if (this.jobs[id])
            {
                schedule.cancelJob(this.jobs[id]);
                delete this.jobs[id];
            }
            else
            {
                logger.warn('cron is not in application: %j', cron);
            }
        }
    }

    updateCron(cronList)
    {
        this.cronHandlers = loadCronHandlers(this.app);
        if (!this.cronHandlers)
            return `${this.app.serverType} 没有 Cron 文件夹， 或者 Cron 没有内容`;
        this.removeCron(cronList);
        for (let i = 0, l = cronList.length; i < l; i++)
        {
            const cron = cronList[i];
            if (!checkAndUpdate(cron, this.crons))
            {
                checkAndAdd(cron, this.crons, this);
            }
        }
        scheduleCron(this, cronList);
    }
}

const initFilter = function(isGlobal, app)
{
    const service = new FilterService();
    let befores, afters;

    if (isGlobal)
    {
        befores = app.get(Constants.KEYWORDS.GLOBAL_BEFORE_FILTER);
        afters = app.get(Constants.KEYWORDS.GLOBAL_AFTER_FILTER);
    }
    else
    {
        befores = app.get(Constants.KEYWORDS.BEFORE_FILTER);
        afters = app.get(Constants.KEYWORDS.AFTER_FILTER);
    }

    let i, l;
    if (befores)
    {
        for (i = 0, l = befores.length; i < l; i++)
        {
            service.before(befores[i]);
        }
    }

    if (afters)
    {
        for (i = 0, l = afters.length; i < l; i++)
        {
            service.after(afters[i]);
        }
    }

    return service;
};

const initHandler = function(app, opts)
{
    return new HandlerService(app, opts);
};

/**
 * Load cron handlers from current application
 */
const loadCronHandlers = function(app)
{
    const p = pathUtil.getCronPath(app.getBase(), app.getServerType());
    if (p)
    {
        return Loader.load(p, app);
    }
};

/**
 * Load cron config from configure file
 */
const loadCronConfig = function(server, app)
{
    const env = app.get(Constants.RESERVED.ENV);
    let p = path.join(app.getBase(), Constants.FILEPATH.CRON);
    if (!fs.existsSync(p))
    {
        p = path.join(app.getBase(), Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CRON));
        if (!fs.existsSync(p))
        {
            return;
        }
    }
    app.loadConfigBaseApp(Constants.RESERVED.CRONS, Constants.FILEPATH.CRON);
    const cronObject = app.get(Constants.RESERVED.CRONS) || {};
    if (cronObject[app.serverType])
    {
        const cronList = cronObject[app.serverType];
        for (let i = 0, l = cronList.length; i < l; i++)
        {
            const cron = cronList[i];
            if (!cron.serverId || app.serverId === cron.serverId)
            {
                checkAndAdd(cron, server.crons, server);
            }
        }
    }
};

/**
 * Fire before filter chain if any
 */
const beforeFilter = function(isGlobal, server, msg, session, cb)
{
    const fm = isGlobal ? server.globalFilterService : server.filterService;
    if (fm)
    {
        fm.beforeFilter(msg, session, cb);
    }
    else
    {
        utils.invokeCallback(cb);
    }
};

/**
 * Fire after filter chain if have
 */
const afterFilter = function(isGlobal, server, err, msg, session, resp, opts, cb)
{
    let fm;
    if (isGlobal)
    {
        fm = server.globalFilterService;
    }
    else
    {
        fm = server.filterService;
    }
    if (fm)
    {
        if (isGlobal)
        {
            fm.afterFilter(err, msg, session, resp, function()
            {
                // do nothing
            });
        }
        else
        {
            fm.afterFilter(err, msg, session, resp, function(err)
            {
                cb(err, resp, opts);
            });
        }
    }
};

/**
 * pass err to the global error handler if specified
 */
const handleError = function(isGlobal, server, err, msg, session, resp, opts, cb)
{
    let handler;
    if (isGlobal)
    {
        handler = server.app.get(Constants.RESERVED.GLOBAL_ERROR_HANDLER);
    }
    else
    {
        handler = server.app.get(Constants.RESERVED.ERROR_HANDLER);
    }
    if (!handler)
    {
        logger.debug(`no default error handler to resolve unknown exception. ${err.stack}`);
        utils.invokeCallback(cb, err, resp, opts);
    }
    else
    {
        if (handler.length === 5)
        {
            handler(err, msg, resp, session, cb);
        }
        else
        {
            handler(err, msg, resp, session, opts, cb);
        }
    }
};

/**
 * Send response to client and fire after filter chain if any.
 */

const response = function(isGlobal, server, err, msg, session, resp, opts, cb)
{
    if (isGlobal)
    {
        cb(err, resp, opts);
        // after filter should not interfere response
        afterFilter(isGlobal, server, err, msg, session, resp, opts, cb);
    }
    else
    {
        afterFilter(isGlobal, server, err, msg, session, resp, opts, cb);
    }
};

/**
 * Parse route string.
 *
 * @param  {string} route route string, such as: serverName.handlerName.methodName
 * @return {object}       parse result object or null for illeagle route string
 */
const parseRoute = function(route)
{
    if (!route)
    {
        return null;
    }
    const ts = route.split('.');
    if (ts.length !== 3)
    {
        return null;
    }

    return {
        route      : route,
        serverType : ts[0],
        handler    : ts[1],
        method     : ts[2]
    };
};

const doForward = function(app, msg, session, routeRecord, cb)
{
    let finished = false;
    // should route to other servers
    try
    {
        app.sysrpc[routeRecord.serverType].msgRemote.forwardMessage(
            // app.sysrpc[routeRecord.serverType].msgRemote.forwardMessage2(
            session,
            msg,
            // msg.oldRoute || msg.route,
            // msg.body,
            // msg.aesPassword,
            // msg.compressGzip,
            session.export(),
            function(err, resp, opts)
            {
                if (err)
                {
                    logger.error(`fail to process remote message:${err.stack}`);
                }
                finished = true;
                utils.invokeCallback(cb, err, resp, opts);
            }
        );
    }
    catch (err)
    {
        if (!finished)
        {
            logger.error(`fail to forward message:${err.stack}`);
            utils.invokeCallback(cb, err);
        }
    }
};

const doHandle = function(server, msg, session, routeRecord, cb)
{
    const originMsg = msg;
    msg = msg.body || {};
    msg.__route__ = originMsg.route;

    const self = server;

    const handle = function(err, resp, opts)
    {
        if (err)
        {
            // error from before filter
            handleError(false, self, err, msg, session, resp, opts, function(err, resp, opts)
            {
                response(false, self, err, msg, session, resp, opts, cb);
            });
            return;
        }

        self.handlerService.handle(routeRecord, msg, session, function(err, resp, opts)
        {
            if (err)
            {
                // error from handler
                handleError(false, self, err, msg, session, resp, opts, function(err, resp, opts)
                {
                    response(false, self, err, msg, session, resp, opts, cb);
                });
                return;
            }

            response(false, self, err, msg, session, resp, opts, cb);
        });
    }; // end of handle

    beforeFilter(false, server, msg, session, handle);
};

/**
 * Schedule cron List
 */
const scheduleCron = function(server, cronList)
{
    if (!cronList || cronList.length <= 0) return;
    const handlers = server.cronHandlers;
    if (!handlers)
    {
        `在服务器中没有找打品对应的cron： ${server}`;
        return;
    }
    for (let i = 0; i < cronList.length; i++)
    {
        const cronInfo = cronList[i];
        const time = cronInfo.time;
        const action = cronInfo.action;
        const jobId = cronInfo.id;
        if (!time || !action || !jobId)
        {
            logger.error(`cron 参数设置错误: ${JSON.stringify(cronInfo)}`);
        }
        else if (action.indexOf('.') < 0)
        {
            logger.error(`cron ${cronInfo} action 格式错误： ${action}`, );
        }
        else
        {
            const cron = action.split('.')[0];
            const job = action.split('.')[1];
            const handler = handlers[cron];

            if (!handler)
            {
                logger.error(`cron ${cronInfo} action 没有找到对应脚本名称错误： ${action}`, );
            }
            else if (typeof handler[job] !== 'function')
            {
                logger.error(`cron ${cronInfo} action ${job} 对应函数不是 function： ${action}`, );
            }
            else
            {
                server.jobs[jobId] = schedule.scheduleJob(time, handler[job].bind(handler));
            }
        }
    }
};

/**
 * If cron is not in cron List then put it in the array.
 */
const checkAndAdd = function(cron, cronList, server)
{
    if (!containCron(cron.id, cronList))
    {
        server.crons.push(cron);
    }
    else
    {
        logger.warn('cron is duplicated: %j', cron);
    }
};

/**
 * Check if cron is in cron List.
 */
const containCron = function(id, cronList)
{
    for (let i = 0, l = cronList.length; i < l; i++)
    {
        if (id === cronList[i].id)
        {
            return true;
        }
    }
    return false;
};

/**
 * If cron is not in cron List then replace it in the array.
 * @param cron
 * @param cronList
 * @return {boolean}
 */
const checkAndUpdate = function(cron, cronList)
{
    for (let i = 0, l = cronList.length; i < l; i++)
    {
        if (cron.id === cronList[i].id)
        {
            cronList[i] = cron;
            return true;
        }
    }
    return false;
};

/**
 * Server factory function.
 *
 * @param {object} app  current application context
 * @return {object} server instance
 */
module.exports.create = function(app, opts)
{
    return new Server(app, opts);
};
