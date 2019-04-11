'use strict';
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
    const proto = Object.getPrototypeOf(this.service);
    const ownPropertyNames = Object.getOwnPropertyNames(proto);
    for (let i = 0, l = ownPropertyNames.length; i < l; i++) {
        const propertyName = ownPropertyNames[i];
        if (propertyName !== 'constructor' && propertyName !== 'start' && propertyName !== 'stop' && typeof proto[propertyName] === 'function')
        {
            this[propertyName] = proto[propertyName].bind(this.service);
        }
    }
};

Component.prototype.name = '__connection__';
