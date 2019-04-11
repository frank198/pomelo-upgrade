const should = require('should');
const pomelo = require('../../index');
const remote = require('../../lib/common/remote/frontend/channelRemote');
const SessionService = require('../../lib/common/service/sessionService');
const ChannelService = require('../../lib/common/service/channelService');
const countDownLatch = require('../../lib/util/countDownLatch');
const MockChannelManager = require('../manager/mockChannelManager');

const mockBase = `${process.cwd()}/test`;

const WAIT_TIME = 200;

describe('channel remote test', function()
{
    describe('#pushMessage', function()
    {
        it('should push message the the specified clients', function(done)
        {
            const sids = [1, 2, 3, 4, 5, 6];
            const uids = [11, 12, 13];
            const frontendId = 'frontend-server-id';
            const mockRoute = 'mock-route-string';
            const mockMsg = {msg: 'some test msg'};
            let invokeCount = 0;
            const invokeUids = [];

            const sessionService = new SessionService();
            sessionService.sendMessageByUid = function(uid, msg)
            {
                mockMsg.should.eql(msg);
                invokeCount++;
                invokeUids.push(uid);
            };

            let session;
            for (let i = 0, l = sids.length, j = 0; i < l; i++)
            {
                session = sessionService.create(sids[i], frontendId);
                if (i % 2)
                {
                    sessionService.bind(session.id, uids[j]);
                    j++;
                }
            }

            const app = pomelo.createApp({base: mockBase});
            app.components.__connector__ = {
                send : function(reqId, route, msg, recvs, opts, cb)
                {
                    app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
                }
            };
            app.components.__connector__.connector = {};
            app.components.__pushScheduler__ = {
                schedule : function(reqId, route, msg, recvs, opts, cb)
                {
                    mockMsg.should.eql(msg);
                    invokeCount += recvs.length;
                    let sess;
                    for (let i = 0; i < recvs.length; i++)
                    {
                        sess = sessionService.get(recvs[i]);
                        if (sess)
                        {
                            invokeUids.push(sess.uid);
                        }
                    }
                    cb();
                }
            };
            app.set('sessionService', sessionService);
            const channelRemote = remote(app);
            channelRemote.pushMessage(mockRoute, mockMsg, uids, {isPush: true}, function()
            {
                invokeCount.should.equal(uids.length);
                invokeUids.length.should.equal(uids.length);
                for (let i = 0, l = uids.length; i < l; i++)
                {
                    // invokeUids.should.include(uids[i]);
                }
                done();
            });
        });
    });

    describe('#broadcast', function()
    {
        it('should broadcast to all the client connected', function(done)
        {
            const sids = [1, 2, 3, 4, 5];
            const uids = [11, 12, 13, 14, 15];
            const frontendId = 'frontend-server-id';
            const mockRoute = 'mock-route-string';
            const mockMsg = {msg: 'some test msg'};
            let invokeCount = 0;

            const sessionService = new SessionService();
            const channelService = new ChannelService();

            let session;
            for (let i = 0, l = sids.length; i < l; i++)
            {
                session = sessionService.create(sids[i], frontendId);
                if (i % 2)
                {
                    session.bind(uids[i]);
                }
            }

            const app = pomelo.createApp({base: mockBase});
            app.components.__connector__ = {
                send : function(reqId, route, msg, recvs, opts, cb)
                {
                    app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
                }
            };
            app.components.__connector__.connector = {};
            app.components.__pushScheduler__ = {
                schedule : function(reqId, route, msg, recvs, opts, cb)
                {
                    invokeCount++;
                    mockMsg.should.eql(msg);
                    should.exist(opts);
                    should.equal(opts.type, 'broadcast');
                    cb();
                }
            };
            app.set('sessionService', sessionService);
            app.set('channelService', channelService);
            const channelRemote = remote(app);
            channelRemote.broadcast(mockRoute, mockMsg, {type: 'broadcast'}, function()
            {
                invokeCount.should.equal(1);
                done();
            });
        });

        it('should broadcast to all the binded client connected', function(done)
        {
            const sids = [1, 2, 3, 4, 5, 6];
            const uids = [11, 12, 13];
            const frontendId = 'frontend-server-id';
            const mockRoute = 'mock-route-string';
            const mockMsg = {msg: 'some test msg'};
            let invokeCount = 0;
            const invokeUids = [];

            const sessionService = new SessionService();
            const channelService = new ChannelService();

            let session;
            for (let i = 0, l = sids.length, j = 0; i < l; i++)
            {
                session = sessionService.create(sids[i], frontendId);
                if (i % 2)
                {
                    session.bind(uids[j]);
                    j++;
                }
            }

            const app = pomelo.createApp({base: mockBase});
            app.components.__connector__ = {
                send : function(reqId, route, msg, recvs, opts, cb)
                {
                    app.components.__pushScheduler__.schedule(reqId, route, msg, recvs, opts, cb);
                }
            };
            app.components.__connector__.connector = {};
            app.components.__pushScheduler__ = {
                schedule : function(reqId, route, msg, recvs, opts, cb)
                {
                    invokeCount++;
                    mockMsg.should.eql(msg);
                    should.exist(opts);
                    should.equal(opts.type, 'broadcast');
                    true.should.equal(opts.userOptions.binded);
                    cb();
                }
            };
            app.set('sessionService', sessionService);
            app.set('channelService', channelService);
            const channelRemote = remote(app);
            channelRemote.broadcast(mockRoute, mockMsg, {
                type        : 'broadcast',
                userOptions : {binded: true}}, function()
            {
                invokeCount.should.equal(1);
                done();
            });
        });
    });
});
