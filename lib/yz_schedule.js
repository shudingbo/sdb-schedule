
var schedule = require('node-schedule');
var fs = require('fs');
var path = require('path');
var con = require('./const.js'); 
var CornParser = require('cron-parser');

module.exports = function( opt ){
	return new YZSchedule( opt );
};


var YZSchedule = function( opt ){
	var self = this;

	var drv = require( path.resolve(__dirname +"/drv/" + opt.cfg_drv));
	this.drv = drv( opt.cfg_opt );

	this.schedules = {};
	this.drv.start_monitor( function(schedulesCfg){
		self.checkSchedulesCfg( schedulesCfg );
	});

	console.log( 'start init ...');
};


/**
 * run all job
 */
YZSchedule.prototype.run = function(){
	
	for( var job in this.schedules ){
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


/**
 * run job
 * @param  {[type]} name job's name
 */
YZSchedule.prototype.runJob = function( name ){
	var job = this.schedules[ name ];
	if( job === undefined ){
		console.log(`-- job [ ${name}] not exist;`);
	}else{
		runJob( this, job );
		console.log('start---');
	}
};

/**
 * run job
 * @param  {[type]} name job's name
 */
YZSchedule.prototype.stopJob = function( name ){
	var job = this.schedules[ name ];
	if( job === undefined ){
		console.log(`-- job [ ${name}] not exist;`);
	}else{
		stopJob( this, job );
	}
};

YZSchedule.prototype.checkSchedulesCfg = function( schedulesCfg ){
	var self = this;
	for( sc in schedulesCfg ){
		var jobCfg = schedulesCfg[sc];
		var ret = addJob( self, sc, jobCfg );

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
				var thisJob = self.schedules[sc];
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
	//console.log( scCfg, this.schedules);

	for( var sc in scCfg ){
		addJob( self, sc, scCfg[sc] );
	}
}



function onExit( self ){
	for( var job in self.schedules ){
		stopJob( self, self.schedules[job]);
	}

	self.drv.stop_monitor();
	console.log('exit ...');
}

function getJobFunPath( jobFun ){
	var pwd = path.resolve(jobFun);
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

		var pwd = getJobFunPath(job['fun']);
		delete require.cache[pwd];

		var ins = require( pwd );
		job['ins'] = ins;
		job['ins']( self,job, con.JobStep.INIT );
		job['job'] = schedule.scheduleJob( job['cron'], function(){
			try{
				var msg = job['ins']( self,job, con.JobStep.RUN );

				if( msg !== undefined ){
					job['msg'] = msg;
				}

				job['latestRunTime'] = parseInt((new Date()).valueOf()/1000);
				job['nextRunTime'] = parseInt(CornParser.parseExpression(job['cron']).next().valueOf()/1000);
				self.drv.update_Job( con.STA.RUN, job);
			}catch(e){
				console.log( "catch exception:" + e );
			}
		});
		
		if( job['job'] !== null ){
			job['status'] = true;
			job['startTime'] = parseInt((new Date()).valueOf()/1000);
			job['stopTime'] = 0;
			job['nextRunTime'] = parseInt(CornParser.parseExpression(job['cron']).next().valueOf()/1000);
			job['msg'] = '';
		}else{
			job['status'] = false;
			job['startTime'] = 0;
			job['stopTime'] = 0;
			job['nextRunTime'] = 0;
			job['msg'] = 'corn parse error.';		
		}

		self.drv.update_Job( con.STA.START, job);
		console.log( `-- run Job [ ${job['name']} ]`);	
	}
}

function stopJob( self, job ){
	if( job['status'] === true){
		console.log( `-- [ ${job['name']} ] stoping ...` );
		var msg = job['ins']( self,job, con.JobStep.STOP );
		if( msg !== undefined ){
			job['msg'] = msg;
		}

		if( job['job'] !== null ){
			job['job'].cancel();
			job['status'] = false;
			job['stopTime'] =  parseInt((new Date()).valueOf()/1000);
			console.log( `-- [ ${job['name']} ] stoped` );
			self.drv.update_Job( con.STA.STOP, job);
		}
	}
}

function addJob( self, name,scCfg ){
	if( self.schedules[ name ] === undefined )
	{	
		var jobTmp = {name:name,
				cron:scCfg['cron'],
				fun :scCfg['fun'],
				switch:scCfg['switch'],
				status:false,
				ins : null,   // 函数实例
				job:null,     // jobID
				startTime:0,
				stopTime:0,
				latestRunTime:0,
				msg:''
			};

		var pwd = path.resolve(scCfg['fun']);
		//console.log( "--- pwd",pwd );
		var exists = fs.existsSync( pwd );
		if( exists === false  ){
			pwd = path.resolve('./node_modules/' +scCfg['fun']);
			//console.log( "--- pwd",pwd );
			exists = fs.existsSync(pwd);
		}

		if( exists === true ){
			self.schedules[name] = jobTmp;
			console.log( `add Job [ ${name} ]` );
			return con.AddCode.OK;
		}else{
			var msg = scCfg['fun'] + " not exists!";
			jobTmp.msg = msg;

			self.drv.update_Job( con.STA.EXCEPTION, jobTmp);
			console.log( `add Job [ ${name} ] fun not exist` );
			return con.AddCode.Exception;
		}
	}else{
		var hasChange = false;
		var thisJob = self.schedules[name];
		if( thisJob['cron'] !== scCfg['cron']){
			thisJob['cron'] = scCfg['cron'];
			hasChange = true;
		}


		if( thisJob['fun'] !== scCfg['fun']){
			thisJob['fun'] = scCfg['fun'];
			hasChange = true;
		}

		var status = thisJob['status']; // 记录任务当前状态 
		if( hasChange === true ){
			console.log( `Change Job [ ${name} ]` );

			stopJob( self, thisJob );

			if( status === true ){
				runJob(self, thisJob );
			}

		}

	}

	console.log( `add Job [ ${name} ] has exist` );
	return con.AddCode.Exist;
}
