/**
 * Pomelo
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
const _ = require('lodash'),
	fs = require('fs'),
	path = require('path'),
	dirName = __dirname,
	Package = require('../package.json'),
	application = require('./application');

const defineGetter = (obj, prop, get) =>
{
	if (Object.defineProperty)
		return Object.defineProperty(obj, prop, accessorDescriptor('get', get));
	if (Object.prototype.__defineGetter__)
		return obj.__defineGetter__(prop, get);

	throw new Error('browser does not support getters');
};

const accessorDescriptor = (field, fun) =>
{
	const desc = {
		enumerable   : true,
		configurable : true};
	desc[field] = fun;
	return desc;
};

const readDirByFS = (pathUrl, objectCollection, pomeloCollection = null) =>
{
	const readFiles = fs.readdirSync(`${dirName}${pathUrl}`);
	_.forEach(readFiles, filename =>
    {
		if (!/\.js$/.test(filename)) return;
		const jsName = path.basename(filename, '.js');
		const loadResult = load.bind(null, `.${pathUrl}/`, jsName);
		defineGetter(objectCollection, jsName, loadResult);
		if (pomeloCollection)
        {
			defineGetter(pomeloCollection, jsName, loadResult);
		}
	});
};

const load = (path, name) =>
{
	if (_.isNil(path))
    {
		return require(name);
	}
	if (_.isNil(name))
    {
		return require(path);
	}
	return require(`${path}${name}`);
};

const pomelo = {
	version        : Package.version,
	events         : require('./util/events'),
	components     : {}, // auto loaded components
	filters        : {}, // auto loaded filters
	rpcFilters     : {},  // auto loaded rpc filters
	connectors     : {},
	pushSchedulers : {}
};

defineGetter(pomelo.connectors, 'sioconnector', load.bind(null, './connectors/sioConnector'));
defineGetter(pomelo.connectors, 'hybridconnector', load.bind(null, './connectors/hybridConnector'));
defineGetter(pomelo.connectors, 'udpconnector', load.bind(null, './connectors/udpConnector'));
defineGetter(pomelo.connectors, 'mqttconnector', load.bind(null, './connectors/mqttConnector'));

defineGetter(pomelo.pushSchedulers, 'direct', load.bind(null, './pushSchedulers/direct'));
defineGetter(pomelo.pushSchedulers, 'buffer', load.bind(null, './pushSchedulers/buffer'));

let app = null;
pomelo.createApp = (opts) =>
{
	app = application;
	app.init(opts);
	pomelo.app = app;
	return app;
};

defineGetter(pomelo, 'app', function() {return app;});

readDirByFS('/components', pomelo.components, pomelo);
readDirByFS('/filters/handler', pomelo.filters, pomelo);
readDirByFS('/filters/rpc', pomelo.rpcFilters);

module.exports = pomelo;