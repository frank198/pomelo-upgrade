'use strict';
const pomelo = require('../../index');
const events = require('../../lib/util/events');
const path = require('path');
const mockBase = path.resolve(process.cwd(), '../');

const app = pomelo.createApp({base: mockBase});
app.start();
app.load(pomelo.server, app.get('serverConfig'));
const server = app.components.__server__;
server.start(() =>{
    console.error('start finish');
});
setTimeout(()=>{
    console.error('调用删除');
    app.event.emit(events.REMOVE_CRONS, [{'id': 'dayTime'}]);
}, 70 * 1000);
