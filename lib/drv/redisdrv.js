var fs = require('fs');
var path = require('path');
var con = require('../const.js'); 
var redis = require('redis');
var async = require('async');
var util = require("util");

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
	this.timerChkInterval = 5000;
	this.cfgUpdateTime = {};  /// 记录各个job的更新时间
	this.cfg = opt;
	this.upJobs = [];   //! 要更新的Job列表
	this.jobCfgs = {};  //! 各个任务的配置文件

	if( opt.checkInterval !== undefined ){
		this.timerChkInterval = opt.checkInterval;
	}

	this.keyChk = opt.keyPre + ":updateTime";
	this.keyJobs = opt.keyPre + ":jobs";
	this.keyStatus = opt.keyPre + ":status";
	this.keyCfg = opt.keyPre + ":cfg";
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
};


RedisDrv.prototype.stop_monitor = function(){
	disconnectRedis( this );
};


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
	cfg['startTime'] = job['startTime'];
	cfg['stopTime'] = job['stopTime'];
	cfg['latestRunTime'] = job['latestRunTime'];
	cfg['msg'] = job['msg'];

	self.redis.hset( self.keyStatus, job['name'], JSON.stringify( cfg) );
};

/** Update Job's msg 
 * @param jobName Job's Name
 * @param msg  Update msg
 */
RedisDrv.prototype.update_msg = function( jobName, msg )
{
	var self = this;

	self.redis.hget( self.keyStatus, jobName,function(err,reply){
		//console.log('-- get config',err,reply );
		if( err === null && reply !== null ){
			var cfg = JSON.parse(reply);
			cfg.msg = msg;
			//console.log('-- get Status', cfg );
			self.redis.hset( self.keyStatus, jobName, JSON.stringify( cfg) );
		}
	});
};



RedisDrv.prototype.getConfig = function( jobName ){
	//console.log( this.jobCfgs  );
	if( this.jobCfgs[ jobName ] !== undefined )
	{
		return this.jobCfgs[jobName];
	}

	return {};
};



function cfgChange( self ){

	var upJobs = self.upJobs.slice(0);
	self.upJobs = [];

	var i = 0;
	var len = upJobs.length;
	for( var i=0; i<len; i++){
		getCfgFromDB( self, upJobs[i]);
	}
}

function getCfgFromDB( self, jobName ){
	self.redis.hget( self.keyJobs, jobName,function( err, reply){
		if( err === null && reply !== null ){
			var schedules = {};
			schedules[ jobName ] = JSON.parse( reply );
			if( self._cb !== null ){
				self._cb( schedules );
			}
		}

		/// 加载配置文件
		self.redis.hget( self.keyCfg, jobName,function(err,reply){
			//console.log('-- get config',err,reply );
			if( err === null && reply !== null ){
				self.jobCfgs[ jobName ] = JSON.parse(reply);
			}
		});
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
			initUpdateTime( self );
			self.timerChk = setInterval( function(){
				checkCfg( self );
			}, self.timerChkInterval );

			//cfgChange( self);			
		}

	});
}

function initUpdateTime( self ){

	async.waterfall([
		function( cb ){
			self.redis.type( self.keyChk,function( err, reply){
				if( err ) {
					cb( err, 0 );
				}

				if( reply != 'hash' ){
					self.redis.del( self.keyChk,function(err,reply){
						cb( err,  reply);
					});
				}else{
					cb( null, 0 );
				}
			});
		},
		function( sta,cb){
			self.redis.hkeys( self.keyJobs,function(err,reply){
				cb( err, reply );
			});
		},
		function( jobNames,cb){
			self.redis.hkeys( self.keyChk,function(err,reply){
				cb( err, jobNames, reply );
			});
		},
		function(jobNames,uTimes,cb){
			var objT = {};
			var uTLen = uTimes.length;
			var i = 0;
			for(i=0;i<uTLen;i++){
				objT[ uTimes[i] ] = 0;
			}

			//console.log( jobNames,uTimes,objT );
			var curTM = parseInt((new Date()).valueOf() /1000);
			
			var len = jobNames.length;
			for( i =0; i<len;i++ )
			{
				var name = jobNames[i];
				if( objT[name] == undefined ){
					self.redis.hset( self.keyChk, name, curTM);
				}

				self.cfgUpdateTime[ name ] = 0;
			}

			//console.log( self.cfgUpdateTime );
			cb( null, 0);
		}
	],function(err,cb){
		if( err !== null ){
			console.log( 'initUpdateTime Err:', err);
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
	self.redis.hgetall( self.keyChk,function( err, reply){
		if( err === null && reply !== null ){
			
			//console.log( reply );
			for( sc in reply ){
				if( reply[sc] != self.cfgUpdateTime[sc] ){
					console.log( 'job [' + sc + '] has change');
					
					self.upJobs.push( sc );
					self.cfgUpdateTime[sc] = reply[sc];
				}
			}
			
			//console.log( self.cfgUpdateTime );
			cfgChange(self);
		}
	});
}

function checkCfg_Old( self ){
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



