'use strict';
/**
 * Component for monitor.
 * Load and start monitor client.
 */
const Monitor = require('../monitor/monitor');
class Component
{
    constructor(app, opts)
    {
        this.monitor = new Monitor(app, opts);
    }

    start(cb)
    {
        this.monitor.start(cb);
    }

    stop(force, cb)
    {
        this.monitor.stop(cb);
    }

    reconnect(masterInfo)
    {
        this.monitor.reconnect(masterInfo);
    }
}

/**
 * Component factory function
 *
 * @param  {object} app  current application context
 * @return {object}      component instances
 */
module.exports = function(app, opts)
{
    return new Component(app, opts);
};

Component.prototype.name = '__monitor__';
