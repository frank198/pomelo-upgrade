'use strict';
const Stream = require('stream');
const protocol = require('pomelo-protocol');
const Package = protocol.Package;
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);

/**
 * Work states
 */
const ST_HEAD = 1; // wait for head
const ST_BODY = 2; // wait for body
const ST_CLOSED = 3; // closed

class TcpSocket extends Stream
{
    constructor(socket, opts)
    {
        super();
        if (!socket || !opts)
        {
            throw new Error('invalid socket or opts');
        }

        if (!opts.headSize || typeof opts.headHandler !== 'function')
        {
            throw new Error('invalid opts.headSize or opts.headHandler');
        }

        // stream style interfaces.
        // TODO: need to port to stream2 after node 0.9
        this.readable = true;
        this.writeable = true;

        this._socket = socket;
        this.headSize = opts.headSize;
        this.closeMethod = opts.closeMethod;
        this.headBuffer = Buffer.alloc(opts.headSize);
        this.headHandler = opts.headHandler;

        this.headOffset = 0;
        this.packageOffset = 0;
        this.packageSize = 0;
        this.packageBuffer = null;

        // bind event form the origin socket
        this._socket.on('data', ondata.bind(null, this));
        this._socket.on('end', onend.bind(null, this));
        this._socket.on('error', this.emit.bind(this, 'error'));
        this._socket.on('close', this.emit.bind(this, 'close'));
        this.state = ST_HEAD;
    }

    send(msg, encode, cb)
    {
        this._socket.write(msg, encode, cb);
    }

    close()
    {
        if (this.closeMethod && this.closeMethod === 'end')
        {
            this._socket.end();
        }
        else
        {
            try
            {
                this._socket.destroy();
            }
            catch (e)
            {
                logger.error('socket close with destroy error: %j', e.stack);
            }
        }
    }
}

/**
 * Tcp socket wrapper with package composite.
 * Collect the package from socket and emit a completed package with 'data' event.
 * Uniform with ws.WebSocket interfaces.
 *
 * @param {object} socket origin socket from node.js net module
 * @param {object} opts   options parameter.
 *                        opts.headSize size of package head
 *                        opts.headHandler(headBuffer) handler for package head. caculate and return body size from head data.
 */
module.exports = function(socket, opts)
{
    if (!(this instanceof TcpSocket))
    {
        return new TcpSocket(socket, opts);
    }
    return this;
};



const ondata = function(socket, chunk)
{
    if (socket.state === ST_CLOSED)
    {
        throw new Error('socket has closed');
    }

    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk))
    {
        throw new Error('invalid data');
    }

    if (typeof chunk === 'string')
    {
        chunk = Buffer.from(chunk, 'utf8');
    }

    let offset = 0, end = chunk.length;

    while (offset < end && socket.state !== ST_CLOSED)
    {
        if (socket.state === ST_HEAD)
        {
            offset = readHead(socket, chunk, offset);
        }

        if (socket.state === ST_BODY)
        {
            offset = readBody(socket, chunk, offset);
        }
    }

    return true;
};

const onend = function(socket, chunk)
{
    if (chunk)
    {
        socket._socket.write(chunk);
    }

    socket.state = ST_CLOSED;
    reset(socket);
    socket.emit('end');
};

/**
 * Read head segment from data to socket.headBuffer.
 *
 * @param  {object} socket Socket instance
 * @param  {object} data   Buffer instance
 * @param  {number} offset offset read star from data
 * @return {number}        new offset of data after read
 */
const readHead = function(socket, data, offset)
{
    const hlen = socket.headSize - socket.headOffset;
    const dlen = data.length - offset;
    const len = Math.min(hlen, dlen);
    let dend = offset + len;

    data.copy(socket.headBuffer, socket.headOffset, offset, dend);
    socket.headOffset += len;

    if (socket.headOffset === socket.headSize)
    {
        // if head segment finished
        const size = socket.headHandler(socket.headBuffer);
        if (size < 0)
        {
            throw new Error(`invalid body size: ${size}`);
        }
        // check if header contains a valid type
        if (checkTypeData(socket.headBuffer[0]))
        {
            socket.packageSize = size + socket.headSize;
            socket.packageBuffer = Buffer.alloc(socket.packageSize);
            socket.headBuffer.copy(socket.packageBuffer, 0, 0, socket.headSize);
            socket.packageOffset = socket.headSize;
            socket.state = ST_BODY;
        }
        else
        {
            dend = data.length;
            logger.error('close the connection with invalid head message, the remote ip is %s && port is %s && message is %j', socket._socket.remoteAddress, socket._socket.remotePort, data);
            socket.close();
        }

    }

    return dend;
};

/**
 * Read body segment from data buffer to socket.packageBuffer;
 *
 * @param  {object} socket Socket instance
 * @param  {object} data   Buffer instance
 * @param  {number} offset offset read star from data
 * @return {number}        new offset of data after read
 */
const readBody = function(socket, data, offset)
{
    const blen = socket.packageSize - socket.packageOffset;
    const dlen = data.length - offset;
    const len = Math.min(blen, dlen);
    const dend = offset + len;

    data.copy(socket.packageBuffer, socket.packageOffset, offset, dend);

    socket.packageOffset += len;

    if (socket.packageOffset === socket.packageSize)
    {
        // if all the package finished
        const buffer = socket.packageBuffer;
        socket.emit('message', buffer);
        reset(socket);
    }

    return dend;
};

const reset = function(socket)
{
    socket.headOffset = 0;
    socket.packageOffset = 0;
    socket.packageSize = 0;
    socket.packageBuffer = null;
    socket.state = ST_HEAD;
};

const checkTypeData = function(data)
{
    return data === Package.TYPE_HANDSHAKE || data === Package.TYPE_HANDSHAKE_ACK || data === Package.TYPE_HEARTBEAT || data === Package.TYPE_DATA || data === Package.TYPE_KICK;
};
