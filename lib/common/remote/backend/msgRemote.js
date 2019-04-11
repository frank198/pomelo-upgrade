'use strict';
const utils = require('../../../util/utils');
const logger = require('pomelo-logger-upgrade').getLogger('forward_log', __filename);

class MsgRemote
{
    constructor(app)
    {
        this.app = app;
    }

    /**
     * Forward message from frontend server to other server's handlers
     * 隐藏的rpc调用,便于将获取到的客户端信息,调用到对应的后端服务器
     * @param msg {object} request message
     * @param session {object} session object for current request
     * @param cb {function} callback function
     */
    forwardMessage(msg, session, cb)
    {
        const server = this.app.components.__server__;
        const sessionService = this.app.components.__backendSession__;
        if (!server)
        {
            logger.error('server component not enable on %s', this.app.serverId);
            utils.invokeCallback(cb, new Error('server component not enable'));
            return;
        }

        if (!sessionService)
        {
            logger.error('backend session component not enable on %s', this.app.serverId);
            utils.invokeCallback(cb, new Error('backend sesssion component not enable'));
            return;
        }

        // generate backend session for current request
        const backendSession = sessionService.create(session);

        // handle the request
        logger.debug('backend server [%s] handle message: %j', this.app.serverId, msg);
        server.handle(msg, backendSession, function(err, resp, opts)
        {
            // cb && cb(err, resp, opts);
            utils.invokeCallback(cb, err, resp, opts);
        });
    }

    forwardMessage2(route, body, aesPassword, compressGzip, session, cb)
    {
        const server = this.app.components.__server__;
        const sessionService = this.app.components.__backendSession__;

        if (!server)
        {
            logger.error('server component not enable on %s', this.app.serverId);
            utils.invokeCallback(cb, new Error('server component not enable'));
            return;
        }

        if (!sessionService)
        {
            logger.error('backend session component not enable on %s', this.app.serverId);
            utils.invokeCallback(cb, new Error('backend sesssion component not enable'));
            return;
        }

        // generate backend session for current request
        const backendSession = sessionService.create(session);

        // handle the request

        // logger.debug('backend server [%s] handle message: %j', this.app.serverId, msg);

        const dmsg = {
            route        : route,
            body         : body,
            compressGzip : compressGzip
        };

        const socket = {
            aesPassword : aesPassword
        };

        const connector = this.app.components.__connector__.connector;
        connector.runDecode(dmsg, socket, (err, msg) =>
        {
            if (err)
            {
                return cb(err);
            }

            server.handle(msg, backendSession, (err, resp, opts) =>
            {
                utils.invokeCallback(cb, err, resp, opts);
            });
        });
    }
}


/**
 * Remote service for backend servers.
 * Receive and handle request message forwarded from frontend server.
 */
module.exports = function(app)
{
    return new MsgRemote(app);
};
