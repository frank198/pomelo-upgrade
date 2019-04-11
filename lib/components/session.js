'use strict';
const SessionService = require('../common/service/sessionService');

module.exports = function(app, opts)
{
    const sessionService = new Component(app, opts);
    app.set('sessionService', sessionService, true);
    return sessionService;
};

/**
 * Session component. Manage sessions.
 *
 * @param {object} app  current application context
 * @param {object} opts attach parameters
 */
const Component = function(app, opts)
{
    opts = opts || {};
    this.app = app;
    this.service = new SessionService(opts);
    const proto = Object.getPrototypeOf(this.service);
    const servicePrototypes = Object.getOwnPropertyNames(proto);
    for (const value of servicePrototypes)
    {
        if (value !== 'constructor' && value !== 'start' && value !== 'stop' && typeof proto[value] === 'function')
        {
            this[value] = proto[value].bind(this.service);
        }
    }
};

Component.prototype.name = '__session__';
