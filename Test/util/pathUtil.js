const pathUtil = require('../../lib/util/pathUtil');
const utils = require('../../lib/util/utils');
const should = require('should');
const fs = require('fs');

const mockBase = process.cwd() + '/test/mock-base';

describe('path util test', function() {
    describe('#getSysRemotePath', function() {
        it('should return the system remote service path for frontend server', function() {
            const role = 'frontend';
            const expectSuffix = '/common/remote/frontend';
            const p = pathUtil.getSysRemotePath(role);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });

        it('should return the system remote service path for backend server', function() {
            const role = 'backend';
            const expectSuffix = '/common/remote/backend';
            const p = pathUtil.getSysRemotePath(role);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });

    });

    describe('#getUserRemotePath', function() {
        it('should return user remote service path for the associated server type', function() {
            const serverType = 'connector';
            const expectSuffix = '/app/servers/connector/remote';
            const p = pathUtil.getUserRemotePath(mockBase, serverType);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });

        it('should return null if the directory not exist', function() {
            let serverType = 'area';
            let p = pathUtil.getUserRemotePath(mockBase, serverType);
            should.not.exist(p);

            serverType = 'some-dir-not-exist';
            p = pathUtil.getUserRemotePath(mockBase, serverType);
            should.not.exist(p);
        });
    });

    describe('#listUserRemoteDir', function() {
        it('should return sub-direcotry name list of servers/ directory', function() {
            const expectNames = ['connector', 'area'];
            const p = pathUtil.listUserRemoteDir(mockBase);
            should.exist(p);
            expectNames.length.should.equal(p.length);
            for (let i = 0, l = expectNames.length; i < l; i++) {
                p.should.include(expectNames[i]);
            }
        });

        it('should throw err if the servers/ illegal', function() {
            (function() {
                pathUtil.listUserRemoteDir('some illegal base');
            }).should.throw();
        });
    });

    describe('#remotePathRecord', function() {
        const namespace = 'user';
        const serverType = 'connector';
        const path = '/some/path/to/remote';
        const r = pathUtil.remotePathRecord(namespace, serverType, path);
        should.exist(r);
        namespace.should.equal(r.namespace);
        serverType.should.equal(r.serverType);
        path.should.equal(r.path);
    });

    describe('#getHandlerPath', function() {
        it('should return user handler path for the associated server type', function() {
            const serverType = 'connector';
            const expectSuffix = '/app/servers/connector/handler';
            const p = pathUtil.getHandlerPath(mockBase, serverType);
            should.exist(p);
            fs.existsSync(p).should.be.true;
            utils.endsWith(p, expectSuffix).should.be.true;
        });

        it('should return null if the directory not exist', function() {
            let serverType = 'area';
            let p = pathUtil.getHandlerPath(mockBase, serverType);
            should.not.exist(p);

            serverType = 'some-dir-not-exist';
            p = pathUtil.getHandlerPath(mockBase, serverType);
            should.not.exist(p);
        });
    });

    describe('#getScriptPath', function() {
        const p = pathUtil.getScriptPath(mockBase);
        const expectSuffix = '/scripts';
        should.exist(p);
        utils.endsWith(p, expectSuffix).should.be.true;
    });

    describe('#getLogPath', function() {
        const p = pathUtil.getLogPath(mockBase);
        const expectSuffix = '/logs';
        should.exist(p);
        utils.endsWith(p, expectSuffix).should.be.true;
    });

});