const mkdirp = require('../bin/mkdirp');
const path = require('path');
const fs = require('fs');
const exists = fs.exists || path.exists;
const _0777 = parseInt('0777', 8);
const _0755 = parseInt('0755', 8);

const x = Math.floor(Math.random() * Math.pow(16, 4)).toString(16);
const y = Math.floor(Math.random() * Math.pow(16, 4)).toString(16);
const z = Math.floor(Math.random() * Math.pow(16, 4)).toString(16);

const file = `/tmp/${[x, y, z].join('/')}`;

mkdirp(file, _0755, function(err) {

	exists(file, function(ex) {
		fs.stat(file, function(err, stat) {
			console.info(stat);
		});
	});
});