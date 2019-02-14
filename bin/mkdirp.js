const path = require('path');
const fs = require('fs');
const _0777 = parseInt('0777', 8);

const Mkdir = (pathLike, mode = null) =>
{
	const extName = path.extname(pathLike);
	if (extName.length > 0) throw new Error(`${pathLike} 不是合法的目录`);
	if (fs.existsSync(pathLike)) return;
	if (!fs.existsSync(path.dirname(pathLike)))
	{
		Mkdir(path.dirname(pathLike), mode);
	}
	fs.mkdirSync(pathLike, mode);
};

const rmdir = (dir) =>
{
	const list = fs.readdirSync(dir);
	for (let i = 0; i < list.length; i++)
	{
		const filename = path.join(dir, list[i]);
		if (filename !== '.' && filename !== '..')
		{
			const stat = fs.statSync(filename);
			if (stat.isDirectory())
			{
				rmdir(filename);
			}
			else
			{
				fs.unlinkSync(filename);
			}
		}
	}
	fs.rmdirSync(dir);
};
module.exports = Mkdir;
module.exports.rmdir = rmdir;