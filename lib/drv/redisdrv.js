const fs = require('fs');
const path = require('path');
const con = require('../const.js'); 
const ioredis = require('ioredis');
const util = require("util");

module.exports = function(opt){
	return new RedisDrv( opt );
};


/**
 * Redis config manager module
 * @param {object} opt json 对象
 */
let RedisDrv = function( opt ){
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
	let self = this;

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
	let self = this;

	let cfg = {};
	cfg['status'] = job['status'];
	cfg['latestHandleType'] = handleType;
	cfg['latestHandleTime'] = parseInt((new Date()).valueOf()/1000);
	cfg['startTime'] = job['startTime'];
	cfg['stopTime'] = job['stopTime'];
	cfg['latestRunTime'] = job['latestRunTime'];
	cfg['nextRunTime'] = job['nextRunTime'];
	cfg['msg'] = job['msg'];
	if( job['parent'] !== undefined && job['parent'] !== null ){
		cfg['parent'] = job['parent']['name'];
	}

	self.redis.hset( self.keyStatus, job['name'], JSON.stringify( cfg) );
};

/** Update Job's msg 
 * @param jobName Job's Name
 * @param msg  Update msg
 */
RedisDrv.prototype.update_msg = function( jobName, msg )
{
	let self = this;

	self.redis.hget( self.keyStatus, jobName,function(err,reply){
		//console.log('-- get config',err,reply );
		if( err === null && reply !== null ){
			let cfg = JSON.parse(reply);
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


RedisDrv.prototype.removeJob = function( jobName ){
	let self = this;
	self.redis.hdel( self.keyStatus, jobName );
};


function cfgChange( self ){

	let upJobs = self.upJobs.slice(0);
	self.upJobs = [];

	let len = upJobs.length;
	for( let i=0; i<len; i++){
		getCfgFromDB( self, upJobs[i]);
	}
}

function getCfgFromDB( self, jobName ){
	self.redis.hget( self.keyJobs, jobName,function( err, reply){
		let schedules = {};
		if( err === null && reply !== null ){
			schedules[ jobName ] = JSON.parse( reply );
		}

		/// 加载配置文件
		self.redis.hget( self.keyCfg, jobName,function(err,reply){
			//console.log('-- get config',err,reply );
			if( err === null && reply !== null ){
				self.jobCfgs[ jobName ] = JSON.parse(reply);
				if( self._cb !== null ){
					self._cb( schedules );
				}
			}
		});
	});
}

function connectRedis( self ){
	self.redis = new ioredis( {
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
		}

	});
}

async function initUpdateTime( self ){
	(async ()=>{
		try{
			let replySta = await self.redis.hgetall( self.keyStatu );

			for( let sta in replySta  ){
				let t = JSON.parse(replySta[sta]);
				if( t['parent'] !== undefined ){
					self.redis.hdel( self.keyStatus, sta );
				}
			}

			///
			let repChkType = await self.redis.type(self.keyChk);
			if( repChkType != 'hash' ){
				await self.redis.del( self.keyChk );
			}

			////
			let repJobNames = self.redis.hkeys( self.keyJobs);
			let repJobChk   = self.redis.hkeys( self.keyChk);

			let objT = {};
			let uTLen = repJobChk.length;
			for(let i=0;i<uTLen;i++){
				objT[ repJobChk[i] ] = 0;
			}

			//console.log( repJobNames,repJobChk,objT );
			let curTM = parseInt((new Date()).valueOf() /1000);
			
			let len = repJobNames.length;
			for(let i =0; i<len;i++ )
			{
				let name = repJobNames[i];
				if( objT[name] == undefined ){
					self.redis.hset( self.keyChk, name, curTM);
				}

				self.cfgUpdateTime[ name ] = 0;
			}
		}catch( err ){
			console.error('initUpdateTime: ', err);
		}
	})();
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




