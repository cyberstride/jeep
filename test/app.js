var assert = require("assert"),
	path = require('path'),
	Piton = require('../lib/app');

describe('The app', function(){
	var piton = new Piton(__dirname+'/testApp');
  describe('when init is called', function(){
    it('should raise a configured event with options', function(){
    	piton.on('configured',function(){
    		assert.notEqual(null,piton.options);
    	});

    	piton.init();
    });

    it('should raise an app_loaded event when modules are done loading',function(){
    	piton.on('app_loaded', function(){
    		var app = piton.app;
    		assert.notEqual('undefined', app.models);
    		assert.notEqual('undefined', app.controllers);
    		assert.notEqual('undefined', app.middleware);
    		assert.equal(null, app.public);
    		assert.equal(null, app.views);
    		assert.equal(null, app.lib);	
    	});

    	piton.init();
    });

    it('should run a module that is in the lib folder', function(){
    	piton.init();
    	assert.ok(piton.app.libTest);
    });
  });

  describe('when loadDirectory is called', function(){
  	var controllerPath = path.join(__dirname, 'testApp/app/controllers');
  	var modelPath = path.join(__dirname, 'testApp/app/models');

  	it('should return an object with the js files in the directory', function(){
  		var obj = Piton.loadDirectory(controllerPath, piton.app);
  		assert.ok(obj);
  		assert.ok(obj.home);
  	});

  	it('should load json files as well', function(){
  		var obj = Piton.loadDirectory(modelPath, piton.app);
  		assert.ok(obj);
  		assert.ok(obj.thing);
  		assert.equal(obj.thing.foo,'bar');
  	});
  });
})