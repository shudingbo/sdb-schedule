'use strict';

const ioredis = require('ioredis');

/**
 * Redis config manager module
 * @param {object} opt json 对象
 */
let RedisDrv = function( opt, sc ){
	this.redis = null;
	this._cb = null;
	this.sc = sc;
	this.logger = sc.logger;
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
		//self.logger.info('-- get config',err,reply );
		if( err === null && reply !== null ){
			let cfg = JSON.parse(reply);
			cfg.msg = msg;
			//self.logger.info('-- get Status', cfg );
			self.redis.hset( self.keyStatus, jobName, JSON.stringify( cfg) );
		}
	});
};



RedisDrv.prototype.getConfig = function( jobName ){
	//this.logger.info( this.jobCfgs  );
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
			//self.logger.info('-- get config',err,reply );
			if( err === null && reply !== null ){
				self.jobCfgs[ jobName ] = JSON.parse(reply);
				if( self._cb !== null ){
					self._cb( schedules );
				}
			}
		});
	});
}

function timeout(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms, 'done');
  });
}

function initData( self ){
	self.logger.info("-- Connect to redis.");

	if( self.timerChk != null ){
		clearInterval( self.timerChk );
	}

	initUpdateTime( self );
	self.timerChk = setInterval( function(){
		checkCfg( self );
	}, self.timerChkInterval );	
}

function connectRedis( self ){
	if( self.cfg.instanse !== undefined )
	{
		(async ()=>{
			while(1){
				if( (typeof(self.cfg.instanse.ins) === 'object') && (self.cfg.instanse.ins !== null) ){
					let a = await self.cfg.instanse.ins.echo('hello');
					if( a === 'hello'){
						self.logger.info("-- redis is reday.");
						self.redis = self.cfg.instanse.ins;
						break;
					}
				}
				await timeout(2000);
			}

			initData(self);
		})();
	}else{
		self.redis = new ioredis( {
			host:self.cfg.host,
			port:self.cfg.port 
		} );

		self.redis.on("error",function( err ){
			self.logger.warn("Error " + err);

		});

		self.redis.on("connect",function( err ){
			if( !err ){
				initData(self);
			}
		});	
	}
}

async function initUpdateTime( self ){
	(async ()=>{
		try{
			let replySta = await self.redis.hgetall( self.keyStatus );

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

			//self.logger.info( repJobNames,repJobChk,objT );
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
			self.logger.warn('initUpdateTime: ', err);
		}
	})();
}


function disconnectRedis( self ){
	if( self.timerChk !== null ){
		clearInterval( self.timerChk );
	}

	if( self.cfg.instanse === undefined ){
		self.redis.quit();
	}
	self.logger.info("-- DisConnect from redis.");
}


function checkCfg( self ){
	self.redis.hgetall( self.keyChk,function( err, reply){
		if( err === null && reply !== null ){
			
			//self.logger.info( reply );
			for( let sc in reply ){
				if( reply[sc] != self.cfgUpdateTime[sc] ){
					self.logger.info( 'job [' + sc + '] has change');
					
					self.upJobs.push( sc );
					self.cfgUpdateTime[sc] = reply[sc];
				}
			}
			
			//self.logger.info( self.cfgUpdateTime );
			cfgChange(self);
		}
	});
}

//
module.exports = function(opt,sc){
	return new RedisDrv( opt,sc );
};

