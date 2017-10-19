const ConnectionService = require('../common/service/connectionService');

/**
 * Connection component for statistics connection status of frontend servers
 */
module.exports = function(app)
{
	return new Component(app);
};

const Component = function(app)
{
	this.app = app;
	this.service = new ConnectionService(app);

	// proxy the service methods except the lifecycle interfaces of component
	let method, self = this;

	const getFun = function(m)
	{
		return (function()
		{
			return function()
			{
				return self.service[m].apply(self.service, arguments);
			};
		})();
	};

	for (const m in this.service)
	{
		if (m !== 'start' && m !== 'stop')
		{
			method = this.service[m];
			if (typeof method === 'function')
			{
				this[m] = getFun(m);
			}
		}
	}
};

Component.prototype.name = '__connection__';
