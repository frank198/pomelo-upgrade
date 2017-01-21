const _ = require('lodash'),
	fs = require('fs'),
	utils = require('../../util/utils'),
	Loader = require('pomelo-loader-upgrade'),
	pathUtil = require('../../util/pathUtil'),
	logger = require('pomelo-logger').getLogger('pomelo', __filename),
	forwardLogger = require('pomelo-logger').getLogger('forward-log', __filename);

class HandlerService
{
	/**
	 * Handler service.
	 * Dispatch request to the relactive handler.
	 *
	 * @param {Object} app      current application context
	 */
	constructor(app, opts)
	{
		this.app = app;
		this.handlerMap = {};
		this.name = 'handler';
		if (opts.reloadHandlers)
		{
			handlerServiceUtility.WatchHandlers(app, this.handlerMap);
		}
		this.enableForwardLog = opts.enableForwardLog || false;
	}

	/**
	 * Handler the request.
	 */
	handle(routeRecord, msg, session, cb)
	{
		// the request should be processed by current server
		const handler = this.getHandler(routeRecord);
		if (!handler)
		{
			logger.error(`[handleManager]: fail to find handler for ${msg.__route__}`);
			utils.invokeCallback(cb, new Error(`fail to find handler for ${msg.__route__}`));
			return;
		}
		const start = Date.now();

		const callback = (err, resp, opts) =>
        {
			if (this.enableForwardLog)
            {
				const log = {
					route    : msg.__route__,
					args     : msg,
					time     : utils.format(new Date(start)),
					timeUsed : new Date() - start
				};
				forwardLogger.info(JSON.stringify(log));
			}
			// resp = handlerServiceUtility.GetResp(arguments);
			utils.invokeCallback(cb, err, resp, opts);

		};

		if (!Array.isArray(msg))
        {
			handler[routeRecord.method](msg, session, callback);
		}
		else
		{
			msg.push(session);
			msg.push(callback);
			handler[routeRecord.method](...msg);
		}
	}

	/**
	 * Get handler instance by routeRecord.
	 *
	 * @param  {Object} routeRecord route record parsed from route string
	 * @return {Object}             handler instance if any matchs or null for match fail
	 */
	getHandler(routeRecord)
	{
		const serverType = routeRecord.serverType;
		if (!this.handlerMap[serverType])
		{
			handlerServiceUtility.LoadHandlers(this.app, serverType, this.handlerMap);
		}
		const handlers = this.handlerMap[serverType] || {};
		const handler = handlers[routeRecord.handler];
		if (!handler)
		{
			logger.warn(`could not find handler for routeRecord: ${routeRecord}`);
			return null;
		}
		if (!_.isFunction(handler[routeRecord.method]))
		{
			logger.warn(`could not find the method ${routeRecord.method} in handler: ${routeRecord.handler}`);
			return null;
		}
		return handler;
	}
}

class handlerServiceUtility
{
	/**
	 * Load handlers from current application
	 */
	static LoadHandlers(app, serverType, handlerMap)
	{
		const p = pathUtil.getHandlerPath(app.getBase(), serverType);
		if (p)
		{
			handlerMap[serverType] = Loader.load(p, app);
		}
	}

	static WatchHandlers(app, handlerMap)
	{
		const p = pathUtil.getHandlerPath(app.getBase(), app.serverType);
		if (p)
		{
			fs.watch(p, function(event, name)
			{
				if (event === 'change')
				{
					handlerMap[app.serverType] = Loader.load(p, app);
				}
			});
		}
	}

	static GetResp(args)
	{
		const len = args.length;
		if (len == 1)
        {
			return [];
		}

		if (len == 2)
        {
			return [args[1]];
		}

		if (len == 3)
        {
			return [args[1], args[2]];
		}

		if (len == 4)
        {
			return [args[1], args[2], args[3]];
		}

		const r = new Array(len);
		for (let i = 1; i < len; i++)
        {
			r[i] = args[i];
		}

		return r;
	}
}

module.exports = function(app, opts)
{
	if (!(this instanceof HandlerService))
	{
		return new HandlerService(app, opts);
	}
};