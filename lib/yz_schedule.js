'use strict';

const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const con = require('./const.js'); 
const CornParser = require('cron-parser');


let YZSchedule = function( opt, app ){
	let self = this;
	
	this.app = app;
	this.logger = (opt.logger !== undefined ) ? opt.logger : console;

	let drv = require( path.resolve(__dirname +"/drv/" + opt.cfg_drv));
	this.drv = drv( opt.cfg_opt, this );

	this.schedules = {};
	this.drv.start_monitor( function(schedulesCfg){
		self.checkSchedulesCfg( schedulesCfg );
	});

	this.logger.info( 'start init ...');
};


/**
 * run all job
 */
YZSchedule.prototype.run = function(){
	
	for( let job in this.schedules ){
		if( this.schedules[job]['switch'] === true ){
			runJob( this,this.schedules[job] );
		}
	}
};

/**
 * Stop this module
 */
YZSchedule.prototype.stop = function(){
	onExit( this );
};

/**
 * Update Job，if cron or fun has change,and the job is running,then restart job.
 * - If job not run,only change the config.
 * - If job not exist,while add new job,but can't run it ,you must manual run it( call runJob );
 * 
 * @param  {string} name  job name
 * @param  {json object} scCfg {"corn":<* * * * * * *>,"fun":"","switch":true|false}
 * @return
 */
YZSchedule.prototype.updateJob = function(name,scCfg ){
	addJob( this, name, scCfg );
};


/** update subJob */
YZSchedule.prototype.updateSubJob = function( name,scCfg ){
	return addSubJob( this,name, scCfg );
};


YZSchedule.prototype.removeSubJob = function( name ){
	return removeSubJob( this,name );
};


/**
 * run job
 * @param  {[type]} name job's name
 */
YZSchedule.prototype.runJob = function( name ){
	let job = this.schedules[ name ];
	if( job === undefined ){
		this.logger.info(`-- job [ ${name}] not exist;`);
	}else{
		runJob( this, job );
		//this.logger.info('start---', name);
	}
};

/**
 * run job
 * @param  {[type]} name job's name
 */
YZSchedule.prototype.stopJob = function( name, msg ){
	let job = this.schedules[ name ];
	if( job === undefined ){
		this.logger.info(`-- job [ ${name}] not exist;`);
	}else{
		if( typeof(msg) === 'string' ){
			job['msg'] = msg;
		}

		stopJob( this, job );
	}
};

YZSchedule.prototype.checkSchedulesCfg = function( schedulesCfg ){
	let self = this;
	for( let sc in schedulesCfg ){
		let jobCfg = schedulesCfg[sc];
		let ret = addJob( self, sc, jobCfg );

		switch( ret ){
			case con.AddCode.OK:
			{
				if( jobCfg['switch'] === true ){
					runJob(self, self.schedules[sc] );
				}
			}
			break;
			case con.AddCode.Exception:
			{

			}
			break;
			case con.AddCode.Exist:
			{
				let thisJob = self.schedules[sc];
				if( jobCfg['switch'] === true ){
					if( thisJob['switch']===false && thisJob['status']=== false){
						runJob(self,thisJob);
					}
				}else if( jobCfg['switch'] === false && thisJob['status']=== true ){
					stopJob(self, thisJob);``
				}

				thisJob['switch'] = jobCfg['switch'];
			}
			break;
		}
	}
};

YZSchedule.prototype.getConfig = function( jobname ){
	return this.drv.getConfig( jobname );	
};

YZSchedule.prototype.updateMsg = function( jobname, msg ){
	return this.drv.update_msg( jobname,msg );	
};



function init( self, scCfg ){
	//self.logger.info( scCfg, this.schedules);

	for( let sc in scCfg ){
		addJob( self, sc, scCfg[sc] );
	}
}

function onExit( self ){
	for( let job in self.schedules ){
		stopJob( self, self.schedules[job]);
	}

	self.drv.stop_monitor();
	self.logger.info('exit ...');
}

function getJobFunPath( jobFun ){
	let pwd = path.resolve(jobFun);
	if( fs.existsSync( pwd ) === true ){
		return pwd;
	}else{
		pwd = path.resolve('./node_modules/' +jobFun);
		if( fs.existsSync( pwd ) === true ){
			return jobFun;
		}
	}

	return '';
}

function runJob(self, job ){
	if( job['status'] === false){

		if( job['parent'] === null || job['parent'] === undefined )
		{
			let pwd = getJobFunPath(job['fun']);
			delete require.cache[pwd];

			let ins = require( pwd );
			job['ins'] = ins;
			job['ins']( self,job, con.JobStep.INIT );
		}

		job['job'] = schedule.scheduleJob( job['cron'], function(){
			try{
				let msg = job['ins']( self,job, con.JobStep.RUN );

				let typeRet = typeof msg;
				if( typeRet === 'object' )
				{
				}else{
					if( msg !== undefined ){
						job['msg'] = msg;
					}

					job['latestRunTime'] = parseInt((new Date()).valueOf()/1000);
					job['nextRunTime'] = getNextRunTime(job['cron']);
					self.drv.update_Job( con.STA.RUN, job);
				}

			}catch(e){
				self.logger.warn( "catch exception:" + e );
			}
		});
		
		if( job['job'] !== null ){
			job['status'] = true;
			job['startTime'] = parseInt((new Date()).valueOf()/1000);
			job['stopTime'] = 0;
			job['nextRunTime'] = getNextRunTime(job['cron']);
			job['msg'] = '';
		}else{
			job['status'] = false;
			job['startTime'] = 0;
			job['stopTime'] = 0;
			job['nextRunTime'] = 0;
			job['msg'] = 'corn parse error.';		
		}

		self.drv.update_Job( con.STA.START, job);

		if( job['parent'] !== null && job['parent'] !== undefined ){
			self.logger.info( `-- run Sub Job [ ${job['name']} ]`);	
		}else{
			self.logger.info( `-- run Job [ ${job['name']} ]`);	
		}
	}
}

function getNextRunTime( spec ){
	let val = 0;
	let nx = null;

	try {
		let inter = CornParser.parseExpression(spec);
		nx = inter.next();
		let curTime = parseInt((new Date()).valueOf()/1000);
		let nxTime = parseInt(nx.valueOf()/1000);
		
		if( nxTime === curTime ){
			nx = inter.next();
		}

  	} catch (err) {
		let type = typeof spec;
		if ((type === 'string') || (type === 'number')) {
			nx = new Date(spec);
		}
	}

	if( nx !== null ){
		val = parseInt( nx.valueOf()/1000 );
	}

	return val;
}


function stopJob( self, job ){
	if( job['status'] === true){
		self.logger.info( `-- [ ${job['name']} ] stoping ...` );
		let msg = job['ins']( self,job, con.JobStep.STOP );
		if( msg !== undefined && typeof(msg) !== 'object' ){
			job['msg'] = msg;
		}

		if( job['job'] !== null ){
			job['job'].cancel();
			job['status'] = false;
			job['stopTime'] =  parseInt((new Date()).valueOf()/1000);
			self.logger.info( `-- [ ${job['name']} ] stoped` );
			self.drv.update_Job( con.STA.STOP, job);
		}
	}
}


function addJob( self, name,scCfg ){
	if( self.schedules[ name ] === undefined )
	{
		let jobTmp = {name:name,
				cron:scCfg['cron'],
				fun :scCfg['fun'],
				switch:scCfg['switch'],
				status:false,
				ins : null,   // 函数实例
				job:null,     // jobID
				startTime:0,
				stopTime:0,
				latestRunTime:0,
				msg:'',
				parent:null
			};

		let pwd = path.resolve(scCfg['fun']);
		//self.logger.info( "--- pwd",pwd );
		let exists = fs.existsSync( pwd );
		if( exists === false  ){
			pwd = path.resolve('./node_modules/' +scCfg['fun']);
			//self.logger.info( "--- pwd",pwd );
			exists = fs.existsSync(pwd);
		}

		if( exists === true ){
			self.schedules[name] = jobTmp;
			self.logger.info( `add Job [ ${name} ]` );
			return con.AddCode.OK;
		}else{
			let msg = scCfg['fun'] + " not exists!";
			jobTmp.msg = msg;

			self.drv.update_Job( con.STA.EXCEPTION, jobTmp);
			self.logger.info( `add Job [ ${name} ] fun not exist` );
			return con.AddCode.Exception;
		}
	}else{
		let hasChange = false;
		let thisJob = self.schedules[name];
		if( thisJob['cron'] !== scCfg['cron']){
			thisJob['cron'] = scCfg['cron'];
			hasChange = true;
		}


		if( thisJob['fun'] !== scCfg['fun']){
			thisJob['fun'] = scCfg['fun'];
			hasChange = true;
		}

		let status = thisJob['status']; // 记录任务当前状态 
		if( hasChange === true ){
			self.logger.info( `Change Job [ ${name} ]` );

			stopJob( self, thisJob );

			if( status === true ){
				runJob(self, thisJob );
			}
		}
	}

	self.logger.info( `add Job [ ${name} ] has exist` );
	return con.AddCode.Exist;
}

/** Add Sub Job,The child and parent to use the same function
 * 
 * 
 */
function addSubJob( self, name,scCfg ){

	if( scCfg['parent'] === undefined ){
		self.logger.info( '[x] no parent info' );
		return con.AddCode.Exception;
	}

    let jobParent = self.schedules[ scCfg['parent'] ];
	if( jobParent === undefined ){
		self.logger.info( '[x] not find parent info' );
		return con.AddCode.Exception;
	}

	if( self.schedules[ name ] === undefined )
	{
		let jobTmp = {name:name,
				cron:scCfg['cron'],
				fun :scCfg['fun'],
				switch:scCfg['switch'],
				status:false,
				ins : jobParent['ins'],   // 函数实例
				job:null,     // jobID
				startTime:0,
				stopTime:0,
				latestRunTime:0,
				msg:'',
				parent:jobParent
			};

		self.schedules[name] = jobTmp;
		self.logger.info( `add Sub Job [ ${name} ]` );
		return con.AddCode.OK;
	}else{
		let hasChange = false;
		let thisJob = self.schedules[name];
		if( thisJob['cron'] !== scCfg['cron']){
			thisJob['cron'] = scCfg['cron'];
			hasChange = true;
		}

		let status = thisJob['status']; // 记录任务当前状态 
		if( hasChange === true ){
			self.logger.info( `Change Sub Job [ ${name} ]` );

			stopJob( self, thisJob );

			if( status === true ){
				runJob(self, thisJob );
			}
		}
	}

	self.logger.info( `add Sub Job [ ${name} ] has exist` );
	return con.AddCode.Exist;
}

function removeSubJob( self ,name )
{
	if( self.schedules[ name ] !== undefined ){

		stopJob( self, self.schedules[ name ] );
		let parJob = self.schedules[ name ].parent;
		
		if( parJob !== undefined && parJob !== null ){
			let schs = self.schedules;
			delete schs[name];
			self.drv.removeJob( name );
		}
	}
}


//////////////
module.exports = function( opt, app ){
	return new YZSchedule( opt,app );
};
