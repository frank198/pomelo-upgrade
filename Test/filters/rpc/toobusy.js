const should = require('should');
const toobusyFilter = require('../../../lib/filters/rpc/toobusy');

const mockData = {
    serverId : 'connector-server-1',
    msg : 'hello',
    opts : {}
};


describe('#toobusyFilter',function() {
    it('should no callback for toobusy',function(done) {
        function load() {
            let callbackInvoked = false;
            toobusyFilter.before(mockData.serverId,mockData.msg,mockData.opts,function(serverId,msg,opts) {
                callbackInvoked = true;
            });

            if (!callbackInvoked) {
                console.log(' logic of toobusy enterd, done!');
                return done();
            }
            const start = new Date();
            while ((new Date() - start) < 250) {
                for (let i = 0; i < 1e5;) i++;
            }
            setTimeout(load, 0);
        }
        load();
    });
});
