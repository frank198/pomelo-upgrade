'use strict';
/**
 * Component for server start up.
 */
const Server = require('../server/server');

class Component
{
    constructor(app, opts)
    {
        this.server = Server.create(app, opts);
    }
    /**
     * Component lifecycle callback
	 * @param {function} cb
	 */
    start(cb)
    {
        this.server.start();
        process.nextTick(cb);
    }

    /**
	 * Component lifecycle callback
	 * @param {function} cb
	 */
    afterStart(cb)
    {
        this.server.afterStart();
        process.nextTick(cb);
    }

    /**
	 * Component lifecycle function
	 *
	 * @param {boolean}  force whether stop the component immediately
	 * @param {function}  cb
	 */
    stop(force, cb)
    {
        this.server.stop();
        process.nextTick(cb);
    }

    /**
	 * Proxy server handle
	 */
    handle(msg, session, cb)
    {
        this.server.handle(msg, session, cb);
    }

    /**
	 * Proxy server global handle
	 */
    globalHandle(msg, session, cb)
    {
        this.server.globalHandle(msg, session, cb);
    }
}

/**
 * Component factory function
 *
 * @param {object} app  current application context
 * @return {object}     component instance
 */
module.exports = function(app, opts)
{
    return new Component(app, opts);
};

Component.prototype.name = '__server__';
