'use strict';
/**
 * Remote channel service for frontend server.
 * Receive push request from backend servers and push it to clients.
 */
const utils = require('../../../util/utils');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);

class FrontChannelRemoteCommon
{
    constructor(app)
    {
        this.app = app;
    }

    /**
     * Push message to client by userIds.
     * @param  {string}   route route string of message
     * @param  {object}   msg   message
     * @param  {string[]}    userIds  user ids that would receive the message
     * @param  {object}   opts  push options
     * @param  {function} cb    callback function
     */
    pushMessage(route, msg, userIds, opts, cb)
    {
        if (!msg)
        {
            logger.error('Can not send empty message! route : %j, compressed msg : %j',
                route, msg);
            utils.invokeCallback(cb, new Error('can not send empty message.'));
            return;
        }

        const connector = this.app.components.__connector__;
        const sessionService = this.app.get('sessionService');
        const fails = [], sids = [];
        let sessions, j, k;
        for (let i = 0, l = userIds.length; i < l; i++)
        {
            sessions = sessionService.getByUid(userIds[i]);
            if (!sessions)
            {
                fails.push(userIds[i]);
            }
            else
            {
                for (j = 0, k = sessions.length; j < k; j++)
                {
                    sids.push(sessions[j].id);
                }
            }
        }
        logger.debug('[%s] pushMessage userIds: %j, msg: %j, sids: %j', this.app.serverId, userIds, msg, sids);
        connector.send(null, route, msg, sids, opts, function(err)
        {
            utils.invokeCallback(cb, err, fails);
        });
    }

    /**
     * Broadcast to all the client connected with current frontend server.
     *
     * @param  {string}    route  route string
     * @param  {object}    msg    message
     * @param  {boolean}   opts   broadcast options.
     * @param  {function}  cb     callback function
     */
    broadcast(route, msg, opts, cb)
    {
        const connector = this.app.components.__connector__;
        if (connector)
            connector.send(null, route, msg, null, opts, cb);
    }
}

module.exports = function(app)
{
    return new FrontChannelRemoteCommon(app);
};
