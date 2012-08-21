var assert = require("assert"),
	path = require('path'),
	Jeep = require('../lib/app');

describe('The app', function(){
	var jeep = new Jeep(__dirname+'/testApp');
  describe('when init is called', function(){
    it('should raise a configured event with options', function(){
    	jeep.init();
      assert.notEqual(null,jeep.options);
    });

    it('should raise an app_loaded event when modules are done loading',function(){
    	
    	jeep.init();
      var app = jeep.app;
      assert.notEqual('undefined', app.models);
      assert.notEqual('undefined', app.controllers);
      assert.notEqual('undefined', app.middleware);
      assert.equal(null, app.public);
      assert.equal(null, app.views);
      assert.equal(null, app.lib);  
    });

    it('should run a module that is in the lib folder', function(){
    	jeep.init();
    	assert.ok(jeep.app.libTest);
    });

    it('should have a path variable assigned to its config',function(){
    	jeep.init();
    	assert.ok(jeep.app.config.path);
    });
  });

  describe('when loadDirectory is called', function(){
  	var controllerPath = path.join(__dirname, 'testApp/app/controllers');
  	var modelPath = path.join(__dirname, 'testApp/app/models');

  	it('should return an object with the js files in the directory', function(){
  		var obj = Jeep.loadDirectory(controllerPath, jeep.app);
  		assert.ok(obj);
  		assert.ok(obj.home);
  	});

  	it('should load json files as well', function(){
  		var obj = Jeep.loadDirectory(modelPath, jeep.app);
  		assert.ok(obj);
  		assert.ok(obj.thing);
  		assert.equal(obj.thing.foo,'bar');
  	});
  });
})