'use strict';
const pomelo = require('../index');
const should = require('should');
const mockBase = process.cwd() + '/Test';

describe('pomelo', function() {
    describe('#createApp', function() {
        it('should create and get app, be the same instance', function(done) {
            let app;
            try {
                app = pomelo.createApp({base: mockBase});
            }
            catch (e) {
                console.error(e);
            }
            app.event.setMaxListeners(10000);

            should.exist(app);

            const app2 = pomelo.app;
            should.exist(app2);
            should.strictEqual(app, app2);
            done();
        });
    });
});
