'use strict';
/**
 * Remote session service for frontend server.
 * Set session info for backend servers.
 */
const utils = require('../../../util/utils');

class FrontedSessionRemote
{
    constructor(app)
    {
        this.app = app;
        this.session = null;
    }

    sessionService()
    {
        if (!this.session && this.app)
            this.session = this.app.get('sessionService');
        return this.session;
    }


    bind(sid, uid, cb)
    {
        this.sessionService().bind(sid, uid, cb);
    }

    unbind(sid, uid, cb)
    {
        this.sessionService().unbind(sid, uid, cb);
    }

    push(sid, key, value, cb)
    {
        this.sessionService().import(sid, key, value, cb);
    }

    pushAll(sid, settings, cb)
    {
        this.sessionService().importAll(sid, settings, cb);
    }

    /**
     * Get session information with session id.
     *
     * @param  {string}   sid session id binded with the session
     * @param  {function} cb(err, serverInfo)  callback function, serverInfo would be null if the session not exist.
     */
    getBackendSessionBySid(sid, cb)
    {
        const session = this.sessionService().get(sid);
        if (!session)
        {
            utils.invokeCallback(cb);
            return;
        }
        utils.invokeCallback(cb, null, session.toFrontendSession().export());
    }

    /**
     * Get all the session information with the specified user id.
     *
     * @param  {string}   uid user id binded with the session
     * @param  {function} cb(err, serverInfo)  callback function, serverInfo would be null if the session does not exist.
     */
    getBackendSessionsByUid(uid, cb)
    {
        const sessions = this.sessionService().getByUid(uid);
        if (!sessions)
        {
            utils.invokeCallback(cb);
            return;
        }

        const res = [];
        for (let i = 0, l = sessions.length; i < l; i++)
        {
            res.push(sessions[i].toFrontendSession().export());
        }
        utils.invokeCallback(cb, null, res);
    }

    /**
     * Kick a session by session id.
     *
     * @param  {number}   sid session id
     * @param  {string}   reason  kick reason
     * @param  {function} cb  callback function
     */
    kickBySid(sid, reason, cb)
    {
        this.sessionService().kickBySessionId(sid, reason, cb);
    }

    /**
     * Kick sessions by user id.
     *
     * @param  {Number|String}   uid user id
     * @param  {string} reason     kick reason
     * @param  {function} cb     callback function
     */
    kickByUid(uid, reason, cb)
    {
        this.sessionService().kick(uid, reason, cb);
    }
}

module.exports = function(app)
{
    return new FrontedSessionRemote(app);
};
