'use strict';
const fs = require('fs');
const path = require('path');
const Constants = require('./constants');
const exp = module.exports;

/**
 * Get system remote service path
 *
 * @param  {string} role server role: frontend, backend
 * @return {string}      path string if the path exist else null
 */
exp.getSysRemotePath = function(role)
{
    const p = path.join(__dirname, '/../common/remote/', role);
    return fs.existsSync(p) ? p : null;
};

/**
 * Get user remote service path
 *
 * @param  {string} appBase    application base path
 * @param  {string} serverType server type
 * @return {string}            path string if the path exist else null
 */
exp.getUserRemotePath = function(appBase, serverType)
{
    const p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.REMOTE);
    return fs.existsSync(p) ? p : null;
};

/**
 * Get user remote cron path
 *
 * @param  {string} appBase    application base path
 * @param  {string} serverType server type
 * @return {string}            path string if the path exist else null
 */
exp.getCronPath = function(appBase, serverType)
{
    const p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.CRON);
    return fs.existsSync(p) ? p : null;
};

/**
 * List all the subdirectory names of user remote directory
 * which hold the codes for all the server types.
 *
 * @param  {string} appBase application base path
 * @return {Array}         all the subdiretory name under servers/
 */
exp.listUserRemoteDir = function(appBase)
{
    const base = path.join(appBase, '/app/servers/');
    const files = fs.readdirSync(base);
    return files.filter(function(fn)
    {
        if (fn.charAt(0) === '.')
        {
            return false;
        }

        return fs.statSync(path.join(base, fn)).isDirectory();
    });
};

/**
 * Compose remote path record
 *
 * @param  {string} namespace  remote path namespace, such as: 'sys', 'user'
 * @param  {string} serverType
 * @param  {string} path       remote service source path
 * @return {object}            remote path record
 */
exp.remotePathRecord = function(namespace, serverType, path)
{
    return {
        namespace  : namespace,
        serverType : serverType,
        path       : path
    };
};

/**
 * Get handler path
 *
 * @param  {string} appBase    application base path
 * @param  {string} serverType server type
 * @return {string}            path string if the path exist else null
 */
exp.getHandlerPath = function(appBase, serverType)
{
    const p = path.join(appBase, '/app/servers/', serverType, Constants.DIR.HANDLER);
    return fs.existsSync(p) ? p : null;
};

/**
 * Get admin script root path.
 *
 * @param  {string} appBase application base path
 * @return {string}         script path string
 */
exp.getScriptPath = function(appBase)
{
    return path.join(appBase, Constants.DIR.SCRIPT);
};

/**
 * Get logs path.
 *
 * @param  {string} appBase application base path
 * @return {string}         logs path string
 */
exp.getLogPath = function(appBase)
{
    return path.join(appBase, Constants.DIR.LOG);
};
