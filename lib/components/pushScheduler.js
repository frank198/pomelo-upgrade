'use strict';
/**
 * Scheduler component to schedule message sending.
 */

const DefaultScheduler = require('../pushSchedulers/direct');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
class PushSchedulerComponent
{
    constructor(app, opts)
    {
        this.app = app;
        opts = opts || {};

        const scheduler = opts.scheduler || DefaultScheduler;
        if (typeof scheduler === 'function')
        {
            this.scheduler = scheduler(app, opts);
        }
        else if (Array.isArray(scheduler))
        {
            const res = {};
            scheduler.forEach(function(sch)
            {
                if (typeof sch.scheduler === 'function')
                    res[sch.id] = sch.scheduler(app, sch.options);
                else
                    res[sch.id] = sch.scheduler;
            });
            this.isSelectable = true;
            this.selector = opts.selector;
            this.scheduler = res;
        }
    }

    /**
     * Component lifecycle callback
     *
     * @param {function} cb
     */
    afterStart(cb)
    {
        if (this.isSelectable)
        {
            for (const k in this.scheduler)
            {
                const sch = this.scheduler[k];
                if (typeof sch.start === 'function')
                {
                    sch.start();
                }
            }
            process.nextTick(cb);
        }
        else if (typeof this.scheduler.start === 'function')
        {
            this.scheduler.start(cb);
        }
        else
        {
            process.nextTick(cb);
        }
    }

    /**
     * Component lifecycle callback
     * @param {boolean} force
     * @param {function} cb
     */
    stop(force, cb)
    {
        if (this.isSelectable)
        {
            for (const k in this.scheduler)
            {
                const sch = this.scheduler[k];
                if (typeof sch.stop === 'function')
                {
                    sch.stop();
                }
            }
            process.nextTick(cb);
        }
        else if (typeof this.scheduler.stop === 'function')
        {
            this.scheduler.stop(cb);
        }
        else
        {
            process.nextTick(cb);
        }
    }

    /**
     * Schedule how the message to send.
     *
     * @param  {number}   reqId request id
     * @param  {string}   route route string of the message
     * @param  {object}   msg   message content after encoded
     * @param  {Array}    receiverSession array of receiver's session id
     * @param  {object}   opts  options
     * @param  {function} cb
     */
    schedule(reqId, route, msg, receiverSession, opts, cb)
    {
        if (this.isSelectable)
        {
            if (typeof this.selector === 'function')
            {
                this.selector(reqId, route, msg, receiverSession, opts, (id) =>
                {
                    if (this.scheduler[id] && typeof this.scheduler[id].schedule === 'function')
                    {
                        this.scheduler[id].schedule(reqId, route, msg, receiverSession, opts, cb);
                    }
                    else
                    {
                        logger.error('invalid pushScheduler id, id: %j', id);
                    }
                });
            }
            else
            {
                logger.error('the selector for pushScheduler is not a function, selector: %j', this.selector);
            }
        }
        else
        {
            if (typeof this.scheduler.schedule === 'function')
            {
                this.scheduler.schedule(reqId, route, msg, receiverSession, opts, cb);
            }
            else
            {
                logger.error('the scheduler does not have a schedule function, scheduler: %j', this.scheduler);
            }
        }
    }
}

module.exports = function(app, opts)
{
    return new PushSchedulerComponent(app, opts);
};

PushSchedulerComponent.prototype.name = '__pushScheduler__';
