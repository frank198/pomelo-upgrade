const should = require('should');
const pomelo = require('../../index');
const ChannelService = require('../../lib/common/service/channelService');

const channelName = 'test_channel';
const mockBase = process.cwd() + '/test';
const mockApp = {serverId: 'test-server-1'};

describe('channel manager test', function() {
    describe('#createChannel', function() {
        it('should create and return a channel with the specified name', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
        });

        it('should return the same channel if the name has already existed', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
            const channel2 = channelService.createChannel(channelName);
            channel.should.equal(channel2);
        });
    });

    describe('#destroyChannel', function() {
        it('should delete the channel instance', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
            channelService.destroyChannel(channelName);
            const channel2 = channelService.createChannel(channelName);
            channel.should.not.equal(channel2);
        });
    });

    describe('#getChannel', function() {
        it('should return the channel with the specified name if it exists', function() {
            const channelService = new ChannelService(mockApp);
            channelService.createChannel(channelName);
            const channel = channelService.getChannel(channelName);
            should.exist(channel);
            channelName.should.equal(channel.name);
        });

        it('should return undefined if the channel dose not exist', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.getChannel(channelName);
            should.not.exist(channel);
        });

        it('should create and return a new channel if create parameter is set', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.getChannel(channelName, true);
            should.exist(channel);
            channelName.should.equal(channel.name);
        });
    });

    describe('#pushMessageByUids', function() {
        it('should push message to the right frontend server', function(done) {
            const sid1 = 'sid1', sid2 = 'sid2';
            const uid1 = 'uid1', uid2 = 'uid2', uid3 = 'uid3';
            const orgRoute = 'test.route.string';
            const mockUids = [
                {sid: sid1, uid: uid1},
                {sid: sid2, uid: uid2},
                {sid: sid2, uid: uid3}
            ];
            const mockMsg = {key: 'some remote message'};
            const uidMap = {};
            for (const i in mockUids) {
                uidMap[mockUids[i].uid] = mockUids[i];
            }

            let invokeCount = 0;

            const mockRpcInvoke = function(sid, rmsg, cb) {
                invokeCount++;
                const args = rmsg.args;
                const route = args[0];
                const msg = args[1];
                const uids = args[2];
                mockMsg.should.eql(msg);

                for (let j = 0, l = uids.length; j < l; j++) {
                    const uid = uids[j];
                    const r2 = uidMap[uid];
                    r2.sid.should.equal(sid);
                }

                cb();
            };

            const app = pomelo.createApp({base: mockBase});
            app.rpcInvoke = mockRpcInvoke;
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(orgRoute, mockMsg, mockUids, function() {
                invokeCount.should.equal(2);
                done();
            });
        });

        it('should return an err if uids is empty', function(done) {
            const mockMsg = {key: 'some remote message'};
            const app = pomelo.createApp({base: mockBase});
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(mockMsg, null, function(err) {
                should.exist(err);
                err.message.should.equal('uids should not be empty');
                done();
            });
        });

        it('should return err if all message fail to push', function(done) {
            const sid1 = 'sid1', sid2 = 'sid2';
            const uid1 = 'uid1', uid2 = 'uid2', uid3 = 'uid3';
            const mockUids = [
                {sid: sid1, uid: uid1},
                {sid: sid2, uid: uid2},
                {sid: sid2, uid: uid3}
            ];
            const mockMsg = {key: 'some remote message'};
            const uidMap = {};
            for (const i in mockUids) {
                uidMap[mockUids[i].uid] = mockUids[i];
            }

            let invokeCount = 0;

            const mockRpcInvoke = function(sid, rmsg, cb) {
                invokeCount++;
                cb(new Error('[TestMockError] mock rpc error'));
            };

            const app = pomelo.createApp({base: mockBase});
            app.rpcInvoke = mockRpcInvoke;
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(mockMsg, mockUids, function(err) {
                invokeCount.should.equal(2);
                should.exist(err);
                err.message.should.equal('all uids push message fail');
                done();
            });
        });

        it('should return fail uid list if fail to push messge to some of the uids', function(done) {
            const sid1 = 'sid1', sid2 = 'sid2';
            const uid1 = 'uid1', uid2 = 'uid2', uid3 = 'uid3';
            const mockUids = [{sid: sid1, uid: uid1}, {sid: sid2, uid: uid2}, {sid: sid2, uid: uid3}];
            const mockMsg = {key: 'some remote message'};
            const uidMap = {};
            for (const i in mockUids) {
                uidMap[mockUids[i].uid] = mockUids[i];
            }

            let invokeCount = 0;

            const mockRpcInvoke = function(sid, rmsg, cb) {
                invokeCount++;
                if (rmsg.args[2].indexOf(uid1) >= 0) {
                    cb(null, [uid1]);
                } else if (rmsg.args[2].indexOf(uid3) >= 0) {
                    cb(null, [uid3]);
                } else {
                    cb();
                }
            };

            const app = pomelo.createApp({base: mockBase});
            app.rpcInvoke = mockRpcInvoke;
            const channelService = new ChannelService(app);

            channelService.pushMessageByUids(mockMsg, mockUids, function(err, fails) {
                invokeCount.should.equal(2);
                should.not.exist(err);
                should.exist(fails);
                fails.length.should.equal(2);
                fails.should.include(uid1);
                fails.should.include(uid3);
                done();
            });
        });
    });

    describe('#broadcast', function() {
        it('should push message to all specified frontend servers', function(done) {
            const mockServers = [
                {id: 'connector-1', serverType: 'connector', other: 'xxx1'},
                {id: 'connector-2', serverType: 'connector', other: 'xxx2'},
                {id: 'area-1', serverType: 'area', other: 'yyy1'},
                {id: 'gate-1', serverType: 'gate', other: 'zzz1'},
                {id: 'gate-2', serverType: 'gate', other: 'xxx1'},
                {id: 'gate-3', serverType: 'gate', other: 'yyy1'}
            ];
            const connectorIds = ['connector-1', 'connector-2'];
            const mockSType = 'connector';
            const mockRoute = 'test.route.string';
            const mockBinded = true;
            const opts = {binded: mockBinded};
            const mockMsg = {key: 'some remote message'};

            let invokeCount = 0;
            const sids = [];

            const mockRpcInvoke = function(sid, rmsg, cb) {
                invokeCount++;
                const args = rmsg.args;
                const route = args[0];
                const msg = args[1];
                const opts = args[2];
                mockMsg.should.eql(msg);
                mockRoute.should.equal(route);
                should.exist(opts);
                mockBinded.should.equal(opts.userOptions.binded);
                sids.push(sid);
                cb();
            };

            const app = pomelo.createApp({base: mockBase});
            app.rpcInvoke = mockRpcInvoke;
            app.addServers(mockServers);
            const channelService = new ChannelService(app);

            channelService.broadcast(mockSType, mockRoute, mockMsg,
                opts, function() {
                    invokeCount.should.equal(2);
                    sids.length.should.equal(connectorIds.length);
                    for (let i = 0, l = connectorIds.length; i < l; i++) {
                        sids.should.include(connectorIds[i]);
                    }
                    done();
                });
        });
    });
});
