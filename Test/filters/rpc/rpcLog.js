const should = require('should');
const rpcLogFilter = require('../../../lib/filters/rpc/rpcLog');

const mockData = {
    serverId : 'connector-server-1',
    msg : 'hello',
    opts : {}
};

describe('#rpcLogFilter',function() {
    it('should do after filter by before filter',function(done) {
        rpcLogFilter.before(mockData.serverId,mockData.msg,mockData.opts,function(serverId,msg,opts) {
            rpcLogFilter.after(serverId,msg,opts,function(serverId,msg,opts) {
                should.exist(opts.__start_time__);
                done();
            });
        });
    });
});