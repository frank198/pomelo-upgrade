/**
 * Filter for toobusy.
 * if the process is toobusy, just skip the new request
 */
const conLogger = require('pomelo-logger-upgrade').getLogger('con_log', __filename);
let toobusy = null;
const DEFAULT_MAXLAG = 70;

module.exports = function(maxLag)
{
	return new Filter(maxLag || DEFAULT_MAXLAG);
};

const Filter = function(maxLag)
{
	try
	{
		toobusy = require('toobusy');
	}
	catch (e)
	{
	}
	if (toobusy)
	{
		toobusy.maxLag(maxLag);
	}
};

Filter.prototype.before = function(msg, session, next)
{
	if (Boolean(toobusy) && toobusy())
	{
		conLogger.warn(`[toobusy] reject request msg: ${msg}`);
		const err = new Error('Server toobusy!');
		err.code = 500;
		next(err);
	}
	else
	{
		next();
	}
};