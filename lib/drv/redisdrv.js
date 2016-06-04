var fs = require('fs');
var path = require('path');
var con = require('../const.js'); 
var redis = require('redis');


module.exports = function(opt){
	return new RedisDrv( opt );
};


/**
 * Redis config manager module
 * @param {object} opt json 对象
 */
var RedisDrv = function( opt ){
	this.redis = null;
	this._cb = null;
	this.timerChk = null;
	this.cfgUpdateTime = 0; 
	this.cfg = opt;

	this.keyChk = opt.keyPre + ":updateTime";
	this.keyJobs = opt.keyPre + ":jobs";
	this.keyStatus = opt.keyPre + ":status";
}


/**
 * Start Monitor the schedule job's change.
 * 
 * @param  {Function} cb when schedule change,will trigger call this CB.
 * @return {[type]}      [description]
 */
RedisDrv.prototype.start_monitor = function(cb){
	var self = this;

	this._cb = cb;
	connectRedis( this );
}


RedisDrv.prototype.stop_monitor = function(){
	disconnectRedis( this );
}


/**
 * Update Job Status
 * @param  {int} handleType @see const.js STA.
 * @param  {object} job  job object
 * @return null
 */
RedisDrv.prototype.update_Job = function( handleType, job){
	var self = this;

	var cfg = {};
	cfg['status'] = job['status'];
	cfg['latestHandleType'] = handleType;
	cfg['latestHandleTime'] = parseInt((new Date()).valueOf()/1000);

	if( handleType == con.STA.START ){
		cfg['startTime'] = parseInt((new Date()).valueOf()/1000);
		cfg['stopTime'] = 0;
		cfg['latestRunTime'] = 0;
	}else if( handleType == con.STA.STOP ){
		cfg['stopTime'] = parseInt((new Date()).valueOf()/1000);
	}else{
		cfg['latestRunTime'] = parseInt((new Date()).valueOf()/1000);
	}


	self.redis.hset( self.keyStatus, job['name'], JSON.stringify( cfg) );
}



function cfgChange( self ){
	self.redis.hgetall( self.keyJobs,function( err, reply){
		if( err === null && reply !== null ){
			var schedules = {};

			for( sc in reply ){
				schedules[ sc ] = JSON.parse( reply[sc] );
			}
			if( self._cb !== null ){
				self._cb( schedules );
			}
		}
	});
}

function connectRedis( self ){
	self.redis = redis.createClient( {
			host:self.cfg.host,
			port:self.cfg.port 
		} );

	self.redis.on("error",function( err ){
		console.log("Error " + err);

	});

	self.redis.on("connect",function( err ){
		
		if( !err ){
			console.log("-- Connect to redis.");

			if( self.timerChk != null ){
				clearInterval( self.timerChk );
			}

			self.timerChk = setInterval( function(){
				checkCfg( self );
			}, 5000 );

			cfgChange( self);			
		}

	});
}

function disconnectRedis( self ){
	if( self.timerChk !== null ){
		clearInterval( self.timerChk );
	}

	self.redis.quit();
	console.log("-- DisConnect from redis.");
}


function checkCfg( self ){
	self.redis.get( self.keyChk,function( err, reply){
		if( err === null && reply !== null ){
			if( self.cfgUpdateTime != reply ){
				console.log( self.keyChk, ' has change');
				self.cfgUpdateTime = reply;

				cfgChange( self );
			}
		}
	});
}



