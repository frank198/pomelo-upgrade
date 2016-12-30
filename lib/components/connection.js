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
		const getFun = (m) =>
        {
			return ((propertyName) =>
            {
				return (...args) =>
                {
					return this.service[propertyName].apply(this.service, ...args);
				};
			})(m);
		};

		const prototypeOf = Object.getPrototypeOf(this.service);
		const propertyNames = Object.getOwnPropertyNames(prototypeOf);
		_.forEach(propertyNames, propertyName =>
        {
			if (propertyName !== 'start' && propertyName !== 'stop' && propertyName != 'constructor')
            {
				const method = prototypeOf[propertyName];
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