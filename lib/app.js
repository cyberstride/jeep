var express = require('express'),
	fs = require('fs'),
	path = require('path'),
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	inherits = require('util').inherits,
	_ = require('underscore')._;

/**
 * Build the app around a default directory structure
 * param @dir the root directory of the calling application structure
 * param @options additional options passed in that govern the running of the app
 */
var Piton = function(dir,options){
	options = normalizeOptions(options);
	dir = dir || __dirname;

	crashGracefully();
	this.app = express();
	this.app.dir = dir;  // should this be app.set('dir',dir) instead? need to see if there's a benefit there
	options.dir = dir;
	this.options = options;
}

inherits(Piton,EventEmitter2);

Piton.prototype.init = function(){
	loadConfig(this);
	autoload(this);

	// Was looking at a public autoloading function like Piton.load(dir) or something to grab it all
	// put that in the index.js of any given directory and then you just have to require that directory
	// is that better or is it better to to it from here?

	// TODO: initializing the app to run all the middleware, locals, etc like base12 does, that's a pretty nice paradigm

	// TODO: implement eventemitter2 and raise events as stuff gets done, use that to manage startup

	// TODO: add clustering 
	
}
/*
 * requires all the files in a directory
 * @param dir the path of the directory to load
 * @param options is an object of signature {whitelist : [], blacklist : []} which defines the files to include or exclude. 
 *           If you include a whitelist, *only* those files will be loaded. This function will always ignore a index.js file
 * @returns object representing the modules loaded
 */
Piton.loadDirectory =function(dir, app, options){
	if(!fs.existsSync(dir)){
		throw new Error('Valid directory path required for Piton to load the directory');
	}
	if(!app || typeof(app) !== 'function'){
		throw new Error('Piton requires the express app instance to be passed to loadDirectory');
	}

	options = options || {};
	var files = fs.readdirSync(dir);
	var loaded = {};
	if(options.whitelist){
		files = _.intersect(files, options.whitelist);
	}else if (options.blacklist){
		files = _.difference(files, options.blacklist);
	}

	files = _.difference(files, ['index.js']);

	files.forEach(function(file){
		var filePath = path.join(dir,file);
		var fileName = file.split('.')[0];
		if(fs.existsSync(filePath)){
			loaded[fileName] = require(filePath)(app);
		}
	});
	return loaded;
}

// TODO: make all private functions take only what they need in params, don't be greedy on piton
/*
 * Private functions
 */
 function autoload(piton, dir){
	var options = piton.options;
	dir = dir || options.dir;
	var appdir = path.join(dir,options.appRoot);

	function load(files){
		var tree = {};
		// todo: test if it's an array or a single file?
		files.forEach(function(file){
			var filePath = path.join(appdir,file);
			tree[file] = require(filePath)(piton.app);
		});
		return tree;
	}
	if(options.whitelist){
		// todo: join these?
		load(whitelist);
	}else{
		var blacklist = options.blacklist || [];
		
		fs.readdir(appdir,function(err,files){
			if(err){ piton.emit('error', err) }
			else{
				var filesToLoad = _.difference(files,blacklist);
				var modules = load(filesToLoad);
				_.extend(piton.app, modules);
			}
			piton.emit('app_loaded');
		});
	}
}

loadConfig = function(piton){
	var options = piton.options;
	var configPath = path.join(options.dir, options.config);
	if(fs.exists(configPath)){
		var fileCfg = require(configPath);
		piton.config = _.extend(fileCfg,options);
	}else{
		piton.config = options;
	}

	piton.emit('configured');
	return piton.config;
}

function normalizeOptions(options){
	options = options || {};
	var normalized = {
		config : 'config',
		blacklist : ['public','views','shared','lib'],
		lib : 'lib',
		views : 'views',
		public : 'public',
		shared : 'shared',
		appRoot : 'app'
	};
	return _.extend(normalized,options);
}

function crashGracefully(){
	process.on('uncaughtException', function(err){
		console.error('Crash Detected');
		console.error(err.stack || err);
		process.exit();
	});
}

module.exports = Piton;