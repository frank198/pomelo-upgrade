'use strict';
const cp = require('child_process');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const utils = require('../util/utils');
const Constants = require('../util/constants');
let env = Constants.RESERVED.ENV_DEV;
const os = require('os');
const cpus = {};
const pomelo = require('../pomelo');

const starter = module.exports;

/**
 * Run all servers
 *
 * @param {object} app current application  context
 * @return {void}
 */
starter.runServers = function(app)
{
    let server, servers;
    const condition = app.startId || app.type;
    switch (condition)
    {
        case Constants.RESERVED.MASTER:
            break;
        case Constants.RESERVED.ALL:
            {
                servers = app.getServersFromConfig();
                const serverIdArr = Object.keys(servers);
                for (let i = 0, l = serverIdArr.length; i < l; i++)
                {
                    const serverId = serverIdArr[i];
                    this.run(app, servers[serverId], null);
                }
            }
            break;
        default:
            server = app.getServerFromConfig(condition);
            if (server)
            {
                this.run(app, server, null);
            }
            else
            {
                servers = app.get(Constants.RESERVED.SERVERS)[condition];
                for (let i = 0, l = servers.length; i < l; i++)
                {
                    this.run(app, servers[i], null);
                }
            }
    }
};

/**
 * Run server
 *
 * @param {object} app current application context
 * @param {object} server
 * @param {function} cb
 * @return {void}
 */
starter.run = function(app, server, cb)
{
    env = app.get(Constants.RESERVED.ENV);

    if (utils.isLocal(server.host))
    {
        let options = [];
        if (server.args)
        {
            if (typeof server.args === 'string')
            {
                options.push(server.args.trim());
            }
            else
            {
                options = options.concat(server.args);
            }
        }
        options.push(app.get(Constants.RESERVED.MAIN));
        options.push(`env=${env}`);
        const keys = Object.keys(server);
        for (let i = 0; i < keys.length; i++)
        {
            const key = keys[i];
            if (key === Constants.RESERVED.CPU)
            {
                cpus[server.id] = server[key];
            }
            options.push(`${key}=${server[key]}`);
        }
        starter.localrun(process.execPath, null, options, cb);
    }
    else
    {
        let cmd = `cd "${app.getBase()}" && "${process.execPath}"`;
        const arg = server.args;
        if (arg !== undefined)
        {
            cmd += arg;
        }
        cmd += ` "${app.get(Constants.RESERVED.MAIN)}" env=${env} `;
        const keys = Object.keys(server);
        for (let i = 0; i < keys.length; i++)
        {
            const key = keys[i];
            if (key === Constants.RESERVED.CPU)
            {
                cpus[server.id] = server[key];
            }
            cmd += ` ${key}=${server[key]} `;
        }
        starter.sshrun(cmd, server.host, cb);
    }
};

/**
 * Bind process with cpu
 *
 * @param {string} sid server id
 * @param {string} pid process id
 * @param {string} host server host
 * @return {void}
 */
starter.bindCpu = function(sid, pid, host)
{
    if (os.platform() === Constants.PLATFORM.LINUX && cpus[sid] !== undefined)
    {
        if (utils.isLocal(host))
        {
            const options = [];
            options.push('-pc');
            options.push(cpus[sid]);
            options.push(pid);
            starter.localrun(Constants.COMMAND.TASKSET, null, options, null);
        }
        else
        {
            const cmd = `taskset -pc "${cpus[sid]}" "${pid}"`;
            starter.sshrun(cmd, host, null);
        }
    }
};

/**
 * Kill application in all servers
 *
 * @param {string[]} pids  array of server's pid
 * @param {string[]} servers array of serverId
 */
starter.kill = function(pids, servers)
{
    let cmd;
    for (let i = 0, l = servers.length; i < l; i++)
    {
        const server = servers[i];
        if (utils.isLocal(server.host))
        {
            const options = [];
            if (os.platform() === Constants.PLATFORM.WIN)
            {
                cmd = Constants.COMMAND.TASKKILL;
                options.push('/pid');
                options.push('/f');
            }
            else
            {
                cmd = Constants.COMMAND.KILL;
                options.push(-9);
            }
            options.push(pids[i]);
            starter.localrun(cmd, null, options, null);
        }
        else
        {
            if (os.platform() === Constants.PLATFORM.WIN)
            {
                cmd = `taskkill /pid ${pids[i]} /f`;
            }
            else
            {
                cmd = `kill -9 ${pids[i]}`;
            }
            starter.sshrun(cmd, server.host, null);
        }
    }
};

/**
 * Use ssh to run command.
 *
 * @param {string} cmd command that would be executed in the remote server
 * @param {string} host remote server host
 * @param {function} cb callback function
 */
starter.sshrun = function(cmd, host, cb)
{
    let args = [];
    args.push(host);
    const ssh_params = pomelo.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS);
    if (Boolean(ssh_params) && Array.isArray(ssh_params))
    {
        args = args.concat(ssh_params);
    }
    args.push(cmd);

    logger.info(`Executing ${cmd} on ${host}:22`);
    spawnProcess(Constants.COMMAND.SSH, host, args, cb);
};

/**
 * Run local command.
 * @param {string} cmd
 ** @param {string|null} host
 * @param {object} options
 * @param {function} callback
 */
starter.localrun = function(cmd, host, options, callback)
{
    logger.info(`Executing ${cmd} ${options} locally`);
    spawnProcess(cmd, host, options, callback);
};

/**
 * Fork child process to run command.
 *
 * @param {string} command
 * @param {string} host
 * @param {object} options
 * @param {function} cb
 *
 */
const spawnProcess = function(command, host, options, cb)
{
    let child = null;

    if (env === Constants.RESERVED.ENV_DEV)
    {
        child = cp.spawn(command, options);
        const prefix = command === Constants.COMMAND.SSH ? `[${host}] ` : '';

        child.stderr.on('data', function(chunk)
        {
            const msg = chunk.toString();
            process.stderr.write(msg);
            if (cb)
            {
                cb(msg);
            }
        });

        child.stdout.on('data', function(chunk)
        {
            const msg = prefix + chunk.toString();
            process.stdout.write(msg);
        });
    }
    else
    {
        child = cp.spawn(command, options, {
            detached : true,
            stdio    : 'inherit'
        });
        child.unref();
    }

    child.on('exit', function(code)
    {
        if (code !== 0)
        {
            logger.warn('child process exit with error, error code: %s, executed command: %s', code, command);
        }
        if (typeof cb === 'function')
        {
            cb(code === 0 ? null : code);
        }
    });
};
