const should = require('should');
const ConnectionService = require('../../lib/common/service/connectionService');

const mockApp = {
    settings: {
        serverId: 'connector-server-1'
    },

    get: function(key) {
        return this.settings[key];
    },

    getServerId: function() {
        return this.get('serverId');
    }
};

describe('connection service test', function() {
    describe('#addLoginedUser', function() {
        it('should add logined user and could fetch it later', function() {
            const service = new ConnectionService(mockApp);
            should.exist(service);
            service.loginedCount.should.equal(0);

            const uid = 'uid1';
            const info = {msg: 'some other message'};
            service.addLoginedUser(uid, info);

            service.loginedCount.should.equal(1);
            const record = service.logined[uid];
            should.exist(record);
            record.should.eql(info);
        });
    });

    describe('#increaseConnectionCount', function() {
        it('should increate connection count and could fetch it later', function() {
            const service = new ConnectionService(mockApp);
            should.exist(service);
            service.connCount.should.equal(0);

            service.increaseConnectionCount();
            service.connCount.should.equal(1);
        });
    });

    describe('#removeLoginedUser', function() {
        it('should remove logined user info with the uid', function() {
            const service = new ConnectionService(mockApp);
            should.exist(service);
            service.loginedCount.should.equal(0);

            const uid = 'uid1';
            const info = {msg: 'some other message'};
            service.addLoginedUser(uid, info);

            service.loginedCount.should.equal(1);
            let record = service.logined[uid];
            should.exist(record);

            const uid2 = 'uid2';
            service.removeLoginedUser(uid2);
            service.loginedCount.should.equal(1);
            record = service.logined[uid];
            should.exist(record);

            service.removeLoginedUser(uid);
            service.loginedCount.should.equal(0);
            record = service.logined[uid];
            should.not.exist(record);
        });
    });

    describe('#decreaseConnectionCount', function() {
        it('should decrease connection count only if uid is empty', function() {
            const service = new ConnectionService(mockApp);
            should.exist(service);

            service.increaseConnectionCount();
            service.connCount.should.equal(1);
            service.decreaseConnectionCount();
            service.connCount.should.equal(0);
        });

        it('should keep zero if connection count become zero', function() {
            const service = new ConnectionService(mockApp);
            should.exist(service);

            service.connCount.should.equal(0);
            service.decreaseConnectionCount();
            service.connCount.should.equal(0);
        });

        it('should remove the logined info if uid is specified', function() {
            const service = new ConnectionService(mockApp);
            should.exist(service);

            service.increaseConnectionCount();

            const uid = 'uid1';
            const info = {msg: 'some other message'};
            service.addLoginedUser(uid, info);

            service.connCount.should.equal(1);
            service.logined[uid].should.eql(info);

            service.decreaseConnectionCount(uid);

            service.connCount.should.equal(0);
            should.not.exist(service.logined[uid]);
        });
    });

    it('should getStatisticsInfo', function(done) {
        const service = new ConnectionService(mockApp);
        const uid1 = 'uid1', uid2 = 'uid2';
        const info1 = 'msg1', info2 = 'msg2';

        service.increaseConnectionCount();
        service.increaseConnectionCount();
        service.increaseConnectionCount();

        service.addLoginedUser(uid1, info1);
        service.addLoginedUser(uid2, info2);


        const sinfo = service.getStatisticsInfo();

        sinfo.should.have.property('serverId', 'connector-server-1');
        sinfo.should.have.property('totalConnCount', 3);
        sinfo.should.have.property('loginedCount', 2);

        const infos = sinfo.loginedList;
        should.exist(infos);
        infos.length.should.equal(2);
        infos.should.include(info1);
        infos.should.include(info2);

        done();
    });
});
