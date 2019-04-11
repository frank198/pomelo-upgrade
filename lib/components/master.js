'use strict';
/**
 * Component for master.
 */
const Master = require('../master/master');

class Component
{
    constructor(app, opts)
    {
        this.master = new Master(app, opts);
    }

    /**
     * Component lifecycle function
     *
     * @param  {function} cb
     */
    start(cb)
    {
        this.master.start(cb);
    }

    /**
     * Component lifecycle function
     * @param  {boolean}   force whether stop the component immediately
     * @param  {function}  cb
     * @return {void}
     */
    stop(force, cb)
    {
        this.master.stop(cb);
    }
}

/**
 * Component factory function
 *
 * @param  {object} app  current application context
 * @param  {object} opts  current options
 * @return {object} opts  component instances
 */
module.exports = function(app, opts)
{
    return new Component(app, opts);
};

Component.prototype.name = '__master__';


