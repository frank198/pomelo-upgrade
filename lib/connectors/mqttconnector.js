const util = require('util');
const EventEmitter = require('events').EventEmitter;
const mqtt = require('mqtt');
const constants = require('../util/constants');
const MQTTSocket = require('./mqttsocket');
const Adaptor = require('./mqtt/mqttadaptor');
const generate = require('./mqtt/generate');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);

let curId = 1;
/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Developer can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
const Connector = function(port, host, opts)
{
    if (!(this instanceof Connector))
    {
        return new Connector(port, host, opts);
    }

    EventEmitter.call(this);
    this.port = port;
    this.host = host;
    this.opts = opts || {};

    this.adaptor = new Adaptor(this.opts);
};
util.inherits(Connector, EventEmitter);

module.exports = Connector;
/**
 * Start connector to listen the specified port
 */
Connector.prototype.start = function(cb)
{
    const self = this;
    this.mqttServer = mqtt.createServer();
    this.mqttServer.on('client', function(client)
    {
        client.on('error', function(err)
        {
            client.stream.destroy();
        });

        client.on('close', function()
        {
            client.stream.destroy();
        });

        client.on('disconnect', function(packet)
        {
            client.stream.destroy();
        });

        if (self.opts.disconnectOnTimeout)
        {
            const timeout = self.opts.timeout * 1000 || constants.TIME.DEFAULT_MQTT_HEARTBEAT_TIMEOUT;
            client.stream.setTimeout(timeout, function()
            {
                client.emit('close');
            });
        }

        client.on('connect', function(packet)
        {
            client.connack({returnCode: 0});
            const mqttsocket = new MQTTSocket(curId++, client, self.adaptor);
            self.emit('connection', mqttsocket);
        });
    });

    this.mqttServer.listen(this.port);

    process.nextTick(cb);
};

Connector.prototype.stop = function()
{
    this.mqttServer.close();
    process.exit(0);
};

const composeResponse = function(msgId, route, msgBody)
{
    return {
        id   : msgId,
        body : msgBody
    };
};

const composePush = function(route, msgBody)
{
    const msg = generate.publish(msgBody);
    if (!msg)
    {
        logger.error('invalid mqtt publish message: %j', msgBody);
    }

    return msg;
};

Connector.prototype.encode = function(reqId, route, msgBody)
{
    if (reqId)
    {
        return composeResponse(reqId, route, msgBody);
    }

    return composePush(route, msgBody);

};

Connector.prototype.close = function()
{
    this.mqttServer.close();
};
