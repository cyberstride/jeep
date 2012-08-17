var express = require('express'),
  fs = require('fs'),
  path = require('path'),
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
  options.appdir = path.join(dir,options.app);
  this.options = options;
}
inherits(Piton,EventEmitter2); 
Piton.prototype.init = function(){
  var app = this.app,
      options = this.options;
      
	this.packageInfo = loadPackageInfo(options);
  app.constants = this.packageInfo.constants || {};
  app.config = loadConfig(app, options);
  loadEnvironmentals(app);
  this.emit('configured');
  autoload(this);
  runLib(app, options);
  setupApp(app, options);
  this.emit('app_loaded');
  // TODO: add clustering 
  // TODO: startup
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
      loaded[fileName] = loadAndRun(filePath, app);
    }
  });
  return loaded;
}

/*
 * Private functions
 */
function loadEnvironmentals(app){
  var variables = process.env;
  var varMap = app.constants.environmentalMap || {};
  for (var n in variables){
    var key = n.toLowerCase();
    if(varMap[key])
      key = varMap[key];
    app.config[key] = variables[n];
  }
  app.settings.environment = app.config.environment || app.config.node_env || 'production';
}

function loadPackageInfo(options){
  var pkgPath = path.join(options.dir, options.package);
  if(fs.existsSync(pkgPath))
    return require(pkgPath);
  return {};
}

function setupApp(app, options){
  app.set('views', path.join(options.appdir, options.views));
  app.set('public', path.join(options.appdir, options.public));
  app.set('view engine', app.config.view_engine);
  app.set('view options', app.config.view_options);
  app.locals({app:app});
}

function loadAndRun(filePath, app){
  var item = require(filePath);
  if('function' === typeof(item))
    item = item(app);
  return item;
}

function runLib(app, options){
  var libdir = path.join(options.appdir, options.lib);
  Piton.loadDirectory(libdir, app, options);
}

function autoload(piton, dir){
  var options = piton.options;
  dir = dir || options.dir;
  var modules = Piton.loadDirectory(options.appdir, piton.app, options);
  _.extend(piton.app, modules);
}

function loadConfig(app, options){
  var overrides = options.configs || {};
  var configPath = path.join(options.dir, options.config);
  var config = loadAndRun(configPath, app);

  return config;
}

function normalizeOptions(options){
  options = options || {};
  var normalized = {
    package : 'package.json',
    config : 'config',
    environment : 'production', // default env
    blacklist : ['public','views','shared','lib'],
    lib : 'lib',
    views : 'views',
    public : 'public',
    shared : 'shared',
    app : 'app'
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