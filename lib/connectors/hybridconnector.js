'use strict';
const net = require('net');
const tls = require('tls');
const EventEmitter = require('events').EventEmitter;

const HybridSocket = require('./hybridsocket');
const pomelo = require('../pomelo');
const Handshake = require('./commands/handshake');
const Heartbeat = require('./commands/heartbeat');
const Kick = require('./commands/kick');
const coder = require('./common/coder');
const WSProcessor = require('./hybrid/wsprocessor');
const TCPProcessor = require('./hybrid/tcpprocessor');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);

let curId = 1;
const HTTP_METHODS = [
    'GET', 'POST', 'DELETE', 'PUT', 'HEAD'
];
const ST_STARTED = 1;
const ST_CLOSED = 2;
const DEFAULT_TIMEOUT = 90;

class Connector extends EventEmitter
{
    constructor(port, host, opts)
    {
        super();
        this.opts = opts || {};
        this.port = port;
        this.host = host;
        this.useDict = opts.useDict;
        this.useProtobuf = opts.useProtobuf;
        this.timeout = (opts.timeout || DEFAULT_TIMEOUT) * 1000;
        this.setNoDelay = opts.setNoDelay;
        this.handshake = new Handshake(opts);
        this.heartbeat = new Heartbeat(opts);
        this.distinctHost = opts.distinctHost;
        this.ssl = opts.ssl;
        // this.switcher = null;
    }

    /**
     * Start connector to listen the specified port
     */
    start(cb)
    {
        const app = pomelo.app;
        this.connector = app.components.__connector__.connector;
        this.dictionary = app.components.__dictionary__;
        this.protobuf = app.components.__protobuf__;
        this.decodeIO_protobuf = app.components.__decodeIO__protobuf__;
        if (!this.ssl)
        {
            this.server = net.createServer();
            this.server.on('connection', this.serverConnection.bind(this));
        }
        else
        {
            // tls 模块是对安全传输层（TLS）及安全套接层（SSL）协议的实现，建立在OpenSSL的基础上
            this.server = tls.createServer(this.ssl);
            this.server.on('secureConnection', this.serverConnection.bind(this));
            this.server.on('clientError', function(e, tlsSo)
            {
                logger.warn('an ssl error occurred before handshake established: ', e);
                tlsSo.destroy();
            });
        }
        this.wsprocessor = new WSProcessor();
        this.wsprocessor.on('connection', this.connection.bind(this));

        this.tcpprocessor = new TCPProcessor(this.opts.closeMethod);
        this.tcpprocessor.on('connection', this.connection.bind(this));

        this.state = ST_STARTED;
        // 指定特有主机连接,一般用于测试使用
        if (this.distinctHost)
            this.server.listen(this.port, this.host);
        else // 监听端口
            this.server.listen(this.port);
        process.nextTick(cb);
    }

    serverConnection(socket)
    {
        if (this.state !== ST_STARTED)
        {
            return;
        }

        socket.setTimeout(this.timeout, function()
        {
            logger.warn(`connection is timeout without communication, the remote ip is ${socket.remoteAddress} && port is ${socket.remotePort}`);
            socket.destroy();
        });

        socket.once('data', data =>
        {
            // FIXME: handle incomplete HTTP method
            if (isHttp(data))
            {
                this.wsprocessor.add(socket, data);
            }
            else
            {
                if (this.setNoDelay)
                {
                    socket.setNoDelay(true);
                }
                this.tcpprocessor.add(socket, data);
            }
        });
    }

    connection(socket)
    {
        const hybridsocket = new HybridSocket(curId++, socket);
        hybridsocket.on('handshake', this.handshake.handle.bind(this.handshake, hybridsocket));
        hybridsocket.on('heartbeat', this.heartbeat.handle.bind(this.heartbeat, hybridsocket));
        hybridsocket.on('disconnect', this.heartbeat.clear.bind(this.heartbeat, hybridsocket.id));
        hybridsocket.on('closing', Kick.handle.bind(null, hybridsocket));
        this.emit('connection', hybridsocket);
    }

    stop(force, cb)
    {
        if (this.state === ST_STARTED)
        {
            this.state = ST_CLOSED;
            this.wsprocessor.close();
            this.tcpprocessor.close();
        }
        this.server.close();
        process.nextTick(cb);
    }
}

Connector.decode = Connector.prototype.decode = coder.decode;
Connector.encode = Connector.prototype.encode = coder.encode;
/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Developer can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
module.exports = function(port, host, opts)
{
    if (!(this instanceof Connector))
    {
        return new Connector(port, host, opts);
    }
    return this;
};

const isHttp = function(data)
{
    const head = data.toString('utf8', 0, 4);

    for (let i = 0, l = HTTP_METHODS.length; i < l; i++)
    {
        if (head.indexOf(HTTP_METHODS[i]) === 0)
        {
            return true;
        }
    }

    return false;
};
