'use strict';
class entryHandler
{
    constructor(app)
    {
        this.app = app;
    }

    /**
     * New client entry.
     *
     * @param  {Object}   msg     request message
     * @param  {Object}   session current session object
     * @param  {Function} next    next step callback
     */
    entry(msg, session, next) {
        next(null, {code: 200, msg: 'game server is ok.'});
    }

    /**
     * Publish route for mqtt connector.
     *
     * @param  {Object}   msg     request message
     * @param  {Object}   session current session object
     * @param  {Function} next    next step callback
     */
    publish(msg, session, next) {
        const result = {
            topic: 'publish',
            payload: JSON.stringify({code: 200, msg: 'publish message is ok.'})
        };
        next(null, result);
    }

    /**
     * Subscribe route for mqtt connector.
     *
     * @param  {Object}   msg     request message
     * @param  {Object}   session current session object
     * @param  {Function} next    next step callback
     * @return {Void}
     */
    subscribe(msg, session, next) {
        const result = {
            topic: 'subscribe',
            payload: JSON.stringify({code: 200, msg: 'subscribe message is ok.'})
        };
        next(null, result);
    }
}

module.exports = function(app) {
    return new entryHandler(app);
};
