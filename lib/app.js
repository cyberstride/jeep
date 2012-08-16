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
	options.dir = dir;
	this.options = options;
}

inherits(Piton,EventEmitter2); // TODO: this might not be very useful after all, if init is all synchronous file reads

Piton.prototype.init = function(){
	loadConfig(this);
	autoload(this);
	runLib(this.app, this.options);
	this.emit('app_loaded');

	// TODO: initializing the app to run all the middleware, locals, etc like base12 does, that's a pretty nice paradigm

	// TODO: implement eventemitter2 and raise events as stuff gets done, use that to manage startup

	// TODO: add clustering 
	
}
/*
 * requires all the modules in a directory. 
 *     If the module is a function, calls the function expecting the signature function(app){ return ... }
 * @param dir the path of the directory to load
 * @param options is an object of signature {whitelist : [], blacklist : []} which defines the files to include or exclude. 
 *           If you include a whitelist, *only* those files will be loaded. This function will always ignore a index.js file
 * @returns object representing the modules loaded or their function return values.
 */
Piton.loadDirectory =function(dir, app, options){
	if(!fs.existsSync(dir))
		throw new Error('Valid directory path required for Piton to load the directory');
	
	if(!app || typeof(app) !== 'function')
		throw new Error('Piton requires the express app instance to be passed to loadDirectory');

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
			var itemToLoad = require(filePath);
			if('function' === typeof(itemToLoad))
				itemToLoad = itemToLoad(app);
			loaded[fileName] = itemToLoad;
		}
	});
	return loaded;
}

/*
 * Private functions
 */
function runLib(app, options){
	var appdir = path.join(options.dir, options.appRoot);
	var libdir = path.join(appdir, options.lib);
	Piton.loadDirectory(libdir, app, options);
}

function autoload(piton, dir){
	var options = piton.options;
	dir = dir || options.dir;
	var appdir = path.join(dir,options.appRoot);
	var modules = Piton.loadDirectory(appdir, piton.app, options);
	_.extend(piton.app, modules);
}

function loadConfig(piton){
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