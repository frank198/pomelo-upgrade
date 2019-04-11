'use strict';
const os = require('os');
const exec = require('child_process').exec;
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const Constants = require('./constants');
const pomelo = require('../pomelo');

const utils = module.exports;

/**
 * Invoke callback with check
 */
utils.invokeCallback = function(cb, ...args)
{
    if (typeof cb === 'function')
    {
        // const len = arguments.length;
        // if (len == 1)
        // {
        //     return cb();
        // }
        //
        // if (len == 2)
        // {
        //     return cb(arguments[1]);
        // }
        //
        // if (len == 3)
        // {
        //     return cb(arguments[1], arguments[2]);
        // }
        //
        // if (len == 4)
        // {
        //     return cb(arguments[1], arguments[2], arguments[3]);
        // }

        // const args = Array(len - 1);
        // for (i = 1; i < len; i++)
        //     args[i - 1] = arguments[i];
        cb(...args);
        // cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * Get the count of elements of object
 */
utils.size = function(obj)
{
    let count = 0;
    for (const i in obj)
    {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function')
        {
            count++;
        }
    }
    return count;
};

/**
 * Check a string whether ends with another string
 */
utils.endsWith = function(str, suffix)
{
    if (typeof str !== 'string' || typeof suffix !== 'string' || suffix.length > str.length)
    {
        return false;
    }
    return str.endsWith(suffix);
};

/**
 * Check a string whether starts with another string
 */
utils.startsWith = function(str, prefix)
{
    if (typeof str !== 'string' || typeof prefix !== 'string' || prefix.length > str.length)
    {
        return false;
    }
    return str.startsWith(prefix);
};

/**
 * Compare the two arrays and return the difference.
 */
utils.arrayDiff = function(array1, array2)
{
    const o = {};
    for (let i = 0, len = array2.length; i < len; i++)
    {
        o[array2[i]] = true;
    }

    const result = [];
    for (let i = 0, len = array1.length; i < len; i++)
    {
        const v = array1[i];
        if (o[v]) continue;
        result.push(v);
    }
    return result;
};

/*
 * Date format
 */
utils.format = function(date, format)
{
    format = format || 'MMddhhmm';
    const o = {
        'M+' : date.getMonth() + 1, // month
        'd+' : date.getDate(), // day
        'h+' : date.getHours(), // hour
        'm+' : date.getMinutes(), // minute
        's+' : date.getSeconds(), // second
        'q+' : Math.floor((date.getMonth() + 3) / 3), // quarter
        'S'  : date.getMilliseconds() // millisecond
    };

    if (/(y+)/.test(format))
    {
        format = format.replace(RegExp.$1, (`${date.getFullYear()}`).substr(4 - RegExp.$1.length));
    }

    for (const k in o)
    {
        if (new RegExp(`(${k})`).test(format))
        {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] :
                (`00${o[k]}`).substr((`${o[k]}`).length));
        }
    }
    return format;
};

/**
 * check if has Chinese characters.
 */
utils.hasChineseChar = function(str)
{
    return /.*[\u4e00-\u9fa5]+.*$/.test(str);
};

/**
 * transform unicode to utf8
 */
utils.unicodeToUtf8 = function(str)
{
    let i, ch;
    let utf8Str = '';
    const len = str.length;
    for (i = 0; i < len; i++)
    {
        ch = str.charCodeAt(i);

        if ((ch >= 0x0) && (ch <= 0x7F))
        {
            utf8Str += str.charAt(i);
        }
        else if ((ch >= 0x80) && (ch <= 0x7FF))
        {
            utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));
        }
        else if ((ch >= 0x800) && (ch <= 0xFFFF))
        {
            utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));
        }
        else if ((ch >= 0x10000) && (ch <= 0x1FFFFF))
        {
            utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));
        }
        else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF))
        {
            utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));
        }
        else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF))
        {
            utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));
        }
    }
    return utf8Str;
};

/**
 * Ping server to check if network is available
 *
 */
utils.ping = function(host, cb)
{
    if (!module.exports.isLocal(host))
    {
        const cmd = `ping -w 15 ${host}`;
        exec(cmd, function(err)
        {
            if (err)
            {
                cb(false);
                return;
            }
            cb(true);
        });
    }
    else
    {
        cb(true);
    }
};

/**
 * Check if server is exit.
 * 检测端口状态
 */
utils.checkPort = function(server, cb)
{
    if (!server.port && !server.clientPort)
    {
        this.invokeCallback(cb, 'leisure');
        return;
    }
    let port = server.port || server.clientPort;
    const host = server.host;
    const generateCommand = function(host, port)
    {
        let cmd;
        let ssh_params = undefined;
        if (pomelo.app)
            ssh_params = pomelo.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS);
        if (Array.isArray(ssh_params))
        {
            ssh_params = ssh_params.join(' ');
        }
        else
        {
            ssh_params = '';
        }
        if (!utils.isLocal(host))
        {
            cmd = `ssh ${host} ${ssh_params} "netstat -an|awk '{print $4}'|grep ${port}|wc -l"`;
        }
        else
        {
            cmd = `netstat -an|awk '{print $4}'|grep ${port}|wc -l`;
        }
        return cmd;
    };
    const cmd1 = generateCommand(host, port);
    exec(cmd1, function(err, stdout)
    {
        if (err)
        {
            logger.error('command %s execute with error: %j', cmd1, err.stack);
            utils.invokeCallback(cb, 'error');
        }
        else if (stdout.trim() !== '0')
        {
            utils.invokeCallback(cb, 'busy');
        }
        else
        {
            port = server.clientPort;
            if (port)
            {
                const cmd2 = generateCommand(host, port);
                exec(cmd2, function(err, stdout)
                {
                    if (err)
                    {
                        logger.error('command %s execute with error: %j', cmd2, err.stack);
                        utils.invokeCallback(cb, 'error');
                    }
                    else if (stdout.trim() !== '0')
                    {
                        utils.invokeCallback(cb, 'busy');
                    }
                    else
                    {
                        utils.invokeCallback(cb, 'leisure');
                    }
                });
            }
        }
    });
};

utils.isLocal = function(host)
{
    const app = require('../pomelo').app;
    if (!app)
    {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host);
    }

    return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host) || host === app.master.host;

};

/**
 * Load cluster server.
 *
 */
utils.loadCluster = function(app, server, serverMap)
{
    const increaseFields = {};
    // const host = server.host;
    const count = parseInt(server[Constants.RESERVED.CLUSTER_COUNT]);
    let seq = app.clusterSeq[server.serverType];
    if (!seq)
    {
        seq = 0;
        app.clusterSeq[server.serverType] = count;
    }
    else
    {
        app.clusterSeq[server.serverType] = seq + count;
    }
    for (const key in server)
    {
        if (server.hasOwnProperty(key))
        {
            const value = server[key].toString();
            if (value.indexOf(Constants.RESERVED.CLUSTER_SIGNAL) > 0)
            {
                increaseFields[key] = value.slice(0, -2);
            }
        }
    }

    const clone = function(src)
    {
        const rs = {};
        for (const key in src)
        {
            rs[key] = src[key];
        }
        return rs;
    };
    for (let i = 0, l = seq; i < count; i++, l++)
    {
        const cserver = clone(server);
        cserver.id = `${Constants.RESERVED.CLUSTER_PREFIX + server.serverType}-${l}`;
        for (const k in increaseFields)
        {
            const v = parseInt(increaseFields[k]);
            cserver[k] = v + i;
        }
        serverMap[cserver.id] = cserver;
    }
};

utils.extends = function(origin, add)
{
    if (!add || !utils.isObject(add)) return origin;
    return Object.assign(origin, add);
};

utils.headHandler = function(headBuffer)
{
    let len = 0;
    for (let i = 1; i < 4; i++)
    {
        if (i > 1)
        {
            len <<= 8;
        }
        len += headBuffer.readUInt8(i);
    }
    return len;
};

const inLocal = function(host)
{
    for (const index in localIps)
    {
        if (host === localIps[index])
        {
            return true;
        }
    }
    return false;
};

const localIps = function()
{
    const faces = os.networkInterfaces();
    const ips = [];
    const func = function(details)
    {
        if (details.family === 'IPv4')
        {
            ips.push(details.address);
        }
    };
    for (const dev in faces)
    {
        faces[dev].forEach(func);
    }
    return ips;
}();

utils.isObject = function(arg)
{
    return typeof arg === 'object' && arg !== null;
};
