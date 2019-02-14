/**
 * Filter for rpc log.
 * Record used time for remote process call.
 */
const rpcLogger = require('pomelo-logger-upgrade').getLogger('rpc-log', __filename);
const utils = require('../../util/utils');

module.exports = function()
{
	return new Filter();
};

const Filter = function()
{
};

Filter.prototype.name = 'rpcLog';

/**
 * Before filter for rpc
 */

Filter.prototype.before = function(serverId, msg, opts, next)
{
	opts = opts || {};
	opts.__start_time__ = Date.now();
	next();
};

/**
 * After filter for rpc
 */
Filter.prototype.after = function(serverId, msg, opts, next)
{
	if (Boolean(opts) && Boolean(opts.__start_time__))
	{
		const start = opts.__start_time__;
		const end = Date.now();
		const timeUsed = end - start;
		const log = {
			route    : msg.service,
			args     : msg.args,
			time     : utils.format(new Date(start)),
			timeUsed : timeUsed
		};
		rpcLogger.info(JSON.stringify(log));
	}
	next();
};
