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
		const self = this;
		var getFun = function(m) {
			return (function() {
				return function() {
					return self.service[m].apply(self.service, arguments);
				};
			})();
		};
		const prototypeOf = Object.getPrototypeOf(this.service);
		const propertyNames =  Object.getOwnPropertyNames(prototypeOf);
		// proxy the service methods except the lifecycle interfaces of component
		_.forEach(propertyNames, propertyName=>
		{
			if(propertyName !== 'start' && propertyName !== 'stop' && propertyName != 'constructor')
			{
				const method = prototypeOf[propertyName];
				if(_.isFunction(method)) {
					this[propertyName] = getFun(propertyName);
				}
			}
		})
		this.name = '__session__';
	}
}

module.exports = function(app, opts)
{
	const cmp = new Session(app, opts);
	app.set('sessionService', cmp, true);
	return cmp;
};