'use strict';
const sequeue = require('../../util/seq-queue');

const manager = module.exports;

const queues = {};

manager.timeout = 3000;

/**
 * Add tasks into task group. Create the task group if it dose not exist.
 *
 * @param {string}   key       task key
 * @param {function} fn        task callback
 * @param {function} onTimeout task timeout callback
 * @param {number}   timeout   timeout for task
 */
manager.addTask = function(key, fn, onTimeout, timeout)
{
    let queue = queues[key];
    if (!queue)
    {
        queue = sequeue.createQueue(manager.timeout);
        queues[key] = queue;
    }

    return queue.push(fn, onTimeout, timeout);
};

/**
 * Destroy task group
 *
 * @param  {string} key   task key
 * @param  {boolean} force whether close task group directly
 */
manager.closeQueue = function(key, force)
{
    if (!queues[key])
    {
        // ignore illeagle key
        return;
    }

    queues[key].close(force);
    delete queues[key];
};
