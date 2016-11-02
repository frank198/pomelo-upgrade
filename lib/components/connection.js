var ConnectionService = require('../common/service/connectionService'),
    _ = require('lodash');

class connection
{
    constructor(app)
    {
        this.app = app;
        this.service = new ConnectionService(app);
        this.name = '__connection__';
        // proxy the service methods except the lifecycle interfaces of component
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
    }
}

/**
 * Connection component for statistics connection status of frontend servers
 */
module.exports = connection;