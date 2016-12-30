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

const readDirByFS = (pathUrl, objectCollection) =>
{
	const readFiles = fs.readdirSync(`${dirName}${pathUrl}`);
	_.forEach(readFiles, filename =>
    {
		if (!/\.js$/.test(filename)) return;
		const jsName = path.basename(filename, '.js');
		const loadResult = load.bind(null, `.${pathUrl}/`, jsName);
		objectCollection[jsName] = loadResult;
		pomelo[jsName] = loadResult;
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
	version    : Package.version,
	events     : require('./util/events'),
	components : {}, // auto loaded components
	filters    : {}, // auto loaded filters
	rpcFilters : {}  // auto loaded rpc filters
};

pomelo.connectors =
{
	sioconnector    : load.bind(null, './connectors/sioConnector'),
	hybridconnector : load.bind(null, './connectors/hybridConnector'),
	udpconnector    : load.bind(null, './connectors/udpConnector'),
	mqttconnector   : load.bind(null, './connectors/mqttConnector')
};

pomelo.pushSchedulers =
{
	direct : load.bind(null, './pushSchedulers/direct'),
	buffer : load.bind(null, './pushSchedulers/buffer')
};

pomelo.createApp = (opts) =>
{
	const app = application;
	app.init(opts);
	pomelo.app = app;
	return app;
};

readDirByFS('/components', pomelo.components);
readDirByFS('/filters/handler', pomelo.filters);
readDirByFS('/filters/rpc', pomelo.rpcFilters);

module.exports = pomelo;