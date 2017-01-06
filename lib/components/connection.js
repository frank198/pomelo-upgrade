const _ = require('lodash'),
	ConnectionService = require('../common/service/connectionService');

class Connection
{
	constructor(app)
    {
		this.app = app;
		this.service = new ConnectionService(app);
		this.name = '__connection__';
        // proxy the service methods except the lifecycle interfaces of component
		const getFun = (propertyName) =>
        {
			return (() =>
            {
				return (...args) =>
                {
					return this.service[propertyName].apply(this.service, ...args);
				};
			})();
		};

		_.forEach(this.service, (method, propertyName) =>
        {
			if (propertyName !== 'start' && propertyName !== 'stop')
            {
				if (_.isFunction(method))
                {
					this[propertyName] = getFun(propertyName);
				}
			}
		});
	}
}

/**
 * Connection component for statistics connection status of frontend servers
 */
module.exports = function(app)
{
	if (!(this instanceof Connection))
    {
		return new Connection(app);
	}
};