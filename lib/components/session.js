const SessionService = require('../common/service/sessionService'),
	_ = require('lodash');

class Session
{
    /**
     * Session component. Manage sessions.
     *
     * @param {Object} app  current application context
     * @param {Object} opts attach parameters
     */
	constructor(app, opts)
    {
		opts = opts || {};
		this.app = app;
		this.service = new SessionService(opts);
        // todo 待验证
		const getFun = m =>
        {
			return (() =>
            {
				return (...args) =>
                {
					const serviceFunction = this.service[m];
					return serviceFunction.apply(this.service, ...args);
				};
			})();
		};
		const prototypeOf = Object.getPrototypeOf(this.service);
		const propertyNames = Object.getOwnPropertyNames(prototypeOf);
        // proxy the service methods except the lifecycle interfaces of component
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
		this.name = '__session__';
	}
}

module.exports = function(app, opts)
{
	const cmp = new Session(app, opts);
	app.set('sessionService', cmp, true);
	return cmp;
};