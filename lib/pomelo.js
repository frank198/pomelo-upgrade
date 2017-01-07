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

const readDirByFS = (pathUrl, objectCollection, isSetterPomelo = false) =>
{
	const readFiles = fs.readdirSync(`${dirName}${pathUrl}`);
	_.forEach(readFiles, filename =>
    {
		if (!/\.js$/.test(filename)) return;
		const jsName = path.basename(filename, '.js');
		const loadResult = load.bind(null, `.${pathUrl}/`, jsName);
		// objectCollection[jsName] = loadResult;

	    objectCollection.__defineGetter__(jsName, loadResult);
		if (isSetterPomelo)
		{
			pomelo.__defineGetter__(jsName, loadResult);
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

pomelo.connectors.__defineGetter__('sioconnector', load.bind(null, './connectors/sioConnector'));
pomelo.connectors.__defineGetter__('hybridconnector', load.bind(null, './connectors/hybridConnector'));
pomelo.connectors.__defineGetter__('udpconnector', load.bind(null, './connectors/udpConnector'));
pomelo.connectors.__defineGetter__('mqttconnector', load.bind(null, './connectors/mqttConnector'));

pomelo.pushSchedulers.__defineGetter__('direct', load.bind(null, './pushSchedulers/direct'));
pomelo.pushSchedulers.__defineGetter__('buffer', load.bind(null, './pushSchedulers/buffer'));

let app = null;
pomelo.createApp = (opts) =>
{
	app = application;
	app.init(opts);
	pomelo.app = app;
	return app;
};

/**
 * Get application
 */
Object.defineProperty(pomelo, 'app', {
	get : function()
	{
		return app;
	}
});

readDirByFS('/components', pomelo.components, true);
readDirByFS('/filters/handler', pomelo.filters, true);
readDirByFS('/filters/rpc', pomelo.rpcFilters, false);

module.exports = pomelo;