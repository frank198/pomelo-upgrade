'use strict';
/**
 * Module dependencies.
 */
const fs = require('fs');
const path = require('path');
const Package = require('../package');

/**
 * Expose `createApplication()`.
 * @module
 */
const Pomelo = {
    // Framework version
    version:Package.version,
    // Event definitions that would be emitted by app.event
    events:require('./util/events'),
    // auto loaded components
    components:{},
    // auto loaded filters
    filters:{},
    // auto loaded rpc filters
    rpcFilters:{},

};

/**
 * connectors
 */
Pomelo.connectors = Object.defineProperties({}, {
    'sioconnector':{get:load.bind(null, './connectors/sioconnector')},
    'hybridconnector':{get:load.bind(null, './connectors/hybridconnector')},
    'udpconnector':{get:load.bind(null, './connectors/udpconnector')},
    'mqttconnector':{get:load.bind(null, './connectors/mqttconnector')},
});

/**
 * pushSchedulers
 */
Pomelo.pushSchedulers = Object.defineProperties({},{
    'direct':{get:load.bind(null, './pushSchedulers/direct')},
    'buffer':{get:load.bind(null, './pushSchedulers/buffer')},
});

/**
 * Create an pomelo application.
 *
 * @return {Application}
 * @memberOf Pomelo
 * @api public
 */
Pomelo.createApp = (opts) =>
{
    const app = require('./application');
    app.init(opts);
    this.app = app;
    return app;
};

/**
 * Get application
 */
Object.defineProperty(Pomelo, 'app', {
    get : () =>{
        return this.app;
    }
});

/**
 * Auto-load bundled components with getters.
 */
fs.readdirSync(`${__dirname}/components`).forEach(function(filename)
{
    if (!/\.js$/.test(filename))
    {
        return;
    }
    const name = path.basename(filename, '.js');
    const _load = load.bind(null, './components/', name);
    Object.defineProperty(Pomelo.components, name, {get:_load});
    Object.defineProperty(Pomelo, name, {get:_load});
});

fs.readdirSync(`${__dirname}/filters/handler`).forEach(function(filename)
{
    if (!/\.js$/.test(filename))
    {
        return;
    }
    const name = path.basename(filename, '.js');
    const _load = load.bind(null, './filters/handler/', name);
    Object.defineProperty(Pomelo.filters, name, {get:_load});
    Object.defineProperty(Pomelo, name, {get:_load});
});

fs.readdirSync(`${__dirname}/filters/rpc`).forEach(function(filename)
{
    if (!/\.js$/.test(filename))
    {
        return;
    }
    const name = path.basename(filename, '.js');
    const _load = load.bind(null, './filters/rpc/', name);
    Object.defineProperty(Pomelo.rpcFilters, name, {get:_load});
});

function load(path, name)
{
    if (name)
    {
        return require(path + name);
    }
    return require(path);
}

module.exports = Pomelo;
