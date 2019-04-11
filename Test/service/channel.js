const should = require('should');
const pomelo = require('../../index');
const ChannelService = require('../../lib/common/service/channelService');

const mockBase = process.cwd() + '/test';
const channelName = 'test_channel';
const mockApp = {serverId: 'test-server-1'};

describe('channel test', function() {
    describe('#add', function() {
        it('should add a member into channel and could fetch it later', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);

            const uid = 'uid1', sid = 'sid1';
            channel.add(uid, sid).should.be.true;

            const member = channel.getMember(uid);
            should.exist(member);
            uid.should.equal(member.uid);
            sid.should.equal(member.sid);
        });

        it('should fail if the sid not specified', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);

            const uid = 'uid1';
            channel.add(uid, null).should.be.false;
        });

        it('should fail after the channel has been destroied', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);

            channel.destroy();

            const uid = 'uid1', sid = 'sid1';
            channel.add(uid, sid).should.be.false;
        });
    });

    describe('#leave', function() {
        it('should remove the member from channel when leave', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);

            const uid = 'uid1', sid = 'sid1';
            channel.add(uid, sid).should.be.true;

            let member = channel.getMember(uid);
            should.exist(member);

            channel.leave(uid, sid);
            member = channel.getMember(uid);
            should.not.exist(member);
        });

        it('should fail if uid or sid not specified', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);

            const uid = 'uid1', sid = 'sid1';
            channel.add(uid, sid).should.be.true;

            channel.leave(uid, null).should.be.false;
            channel.leave(null, sid).should.be.false;
        });
    });

    describe('#getMembers', function() {
        it('should return all the members of channel', function() {
            const uinfos = [
                {uid: 'uid1', sid: 'sid1'},
                {uid: 'uid2', sid: 'sid2'},
                {uid: 'uid3', sid: 'sid3'}
            ];

            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);

            let i, l, item;
            for (i = 0, l = uinfos.length; i < l; i++) {
                item = uinfos[i];
                channel.add(item.uid, item.sid);
            }

            const members = channel.getMembers();
            should.exist(members);
            members.length.should.equal(uinfos.length);
            for (i = 0, l = uinfos.length; i < l; i++) {
                item = uinfos[i];
                members.includes(item.uid);
            }
        });
    });

    describe('#pushMessage', function() {
        it('should push message to the right frontend server by sid', function(done) {
            const sid1 = 'sid1', sid2 = 'sid2';
            const uid1 = 'uid1', uid2 = 'uid2', uid3 = 'uid3';
            const mockUids = [{sid: sid1, uid: uid1}, {sid: sid2, uid: uid2}, {sid: sid2, uid: uid3}];
            const mockMsg = {key: 'some remote message'};
            const uidMap = {};
            for (let i in mockUids) {
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

            const channel = channelService.createChannel(channelName);
            for (let i = 0, l = mockUids.length; i < l; i++) {
                channel.add(mockUids[i].uid, mockUids[i].sid);
            }

            channel.pushMessage(mockMsg, function() {
                invokeCount.should.equal(2);
                done();
            });
        });
        it('should fail if channel has destroied', function() {
            const channelService = new ChannelService(mockApp);
            const channel = channelService.createChannel(channelName);
            should.exist(channel);

            channel.destroy();

            channel.pushMessage({}, function(err) {
                should.exist(err);
                err.message.should.equal('channel is not running now');
            });
        });
    });
});
