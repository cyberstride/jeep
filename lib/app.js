var express = require('express'),
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore')._;

var defaults = {
    package : 'package.json',
    config : 'config',
    environment : 'production', // default env
    blacklist : ['public','views','shared','lib', 'models','controllers','middleware'],
    lib : 'lib',
    models: 'models',
    controllers: 'controllers',
    middleware: 'middleware',
    views : 'views',
    public : 'public',
    shared : 'shared',
    app : 'app'
  };

var Jeep = function(dir,options){
  options = _.extend(defaults,options)
  dir = dir || __dirname;

  crashGracefully();
  this.app = express();
  this.app.set('environment',options.environment);
  options.dir = dir;
  options.appdir = path.join(dir,options.app);
  this.options = options;
}
Jeep.prototype.init = function(){
  var app = this.app,
      options = this.options;
      
  this.packageInfo = loadPackageInfo(options);
  app.constants = this.packageInfo.constants || {};
  app.config = loadConfig(app, options);
  loadEnvironmentals(app);
  setupApp(app, options);
  autoload(this);
  runLib(app, options);
  // TODO: add clustering
}

Jeep.loadDirectory =function(dir, app, options){
  if(!fs.existsSync(dir))
    throw new Error('Valid directory path required for jeep to load the directory');
  
  if(!app || typeof(app) !== 'function')
    throw new Error('jeep requires the express app instance to be passed to loadDirectory');

  options = options || {};
  var loaded = {};

  if(fs.existsSync(path.join(dir,'index.js'))){
    loaded = require(dir);
  }else{
    var files = fs.readdirSync(dir);
    
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
}

Jeep.run = function(dir, options){
  var jeep = new Jeep(dir, options);
  jeep.init();
  jeep.app.listen(jeep.app.config.port);
}

function loadEnvironmentals(app){
  var variables = process.env;
  var varMap = app.constants.environmentalMap || {};
  for (var n in variables){
    var key = n.toLowerCase();
    if(varMap[key])
      key = varMap[key];
    app.config[key] = variables[n];
  }
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
  jeep.loadDirectory(libdir, app, options);
}

function autoload(jeep){
  var options = jeep.options;
  [options.models, options.middleware, options.controllers].forEach(function(folder){
    var moduleDir = path.join(options.appdir, folder);
    jeep.app[folder] = Jeep.loadDirectory(moduleDir, jeep.app, options);
  });
  var modules = Jeep.loadDirectory(options.appdir, jeep.app, options);
  _.extend(jeep.app, modules);
}

function loadConfig(app, options){
  var configPath = path.join(options.dir, options.config);
  var config = loadAndRun(configPath, app);
  config.port = config.port || 3000; // defaults we may want to load elsewhere?
  return config;
}

function crashGracefully(){
  process.on('uncaughtException', function(err){
    console.error('Crash Detected');
    console.error(err.stack || err);
    process.exit();
  });
}

module.exports = Jeep;