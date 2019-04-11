const should = require('should');
const timeoutFilter = require('../../../lib/filters/handler/timeout');
const FilterService = require('../../../lib/common/service/filterService');
const util = require('util');
const mockSession = {
    key : '123'
};

const WAIT_TIME = 100;
describe('#serialFilter',function() {
    it('should do before filter ok',function(done) {
        const service = new FilterService();
        const filter = timeoutFilter();
        service.before(filter);

        service.beforeFilter(null,mockSession,function() {
            should.exist(mockSession);

            should.exist(mockSession.__timeout__);
            done();
        });
    });

    it('should do after filter by doing before filter ok',function(done) {
        const service = new FilterService();
        const filter = timeoutFilter();
        let _session ;
        service.before(filter);

        service.beforeFilter(null,mockSession,function() {
            should.exist(mockSession);
            should.exist(mockSession.__timeout__);
            _session = mockSession;
        });

        service.after(filter);

        service.afterFilter(null,null,mockSession,null,function() {
            should.exist(mockSession);
            should.strictEqual(mockSession,_session);
        });

        setTimeout(done,WAIT_TIME);
        done();
    });
});