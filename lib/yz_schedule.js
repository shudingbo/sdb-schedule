
var schedule = require('node-schedule');
var fs = require('fs');
var path = require('path');
var con = require('./const.js'); 

module.exports = function( opt ){
	return new YZSchedule( opt );
};


var YZSchedule = function( opt ){
	var self = this;

	var drv = require( path.resolve("./lib/drv/" + opt.cfg_drv));
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
}

/**
 * Stop this module
 */
YZSchedule.prototype.stop = function(){
	onExit( this );
}

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
}


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
	}
}

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
}

YZSchedule.prototype.checkSchedulesCfg = function( schedulesCfg ){
	var self = this;
	for( sc in schedulesCfg ){
		var jobCfg = schedulesCfg[sc];
		var ret = addJob( self, sc, jobCfg );
		if( ret === true ){
			if( jobCfg['switch'] === true ){
				runJob(self, self.schedules[sc] );
			}
		}else{ // already has this job
			var thisJob = self.schedules[sc];
			if( jobCfg['switch'] === true && thisJob['status']=== false ){
				runJob(self,thisJob);
			}else if( jobCfg['switch'] === false && thisJob['status']=== true ){
				stopJob(self, thisJob);
			}
		}

	}
}



function init( self, scCfg ){
	//console.log( scCfg, this.schedules);

	for( var sc in scCfg ){
		addJob( self, sc, scCfg[sc] );
	}
}



function onExit( self ){

	self.drv.stop_monitor();


	for( var job in self.schedules ){
		stopJob( self, self.schedules[job]);
	}

	console.log('exit ...');
}



function runJob(self, job ){
	if( job['status'] === false){

		var pwd = path.resolve(job['fun']);

		delete require.cache[pwd];

		var ins = require( pwd );
		job['ins'] = ins;

		job['job'] = schedule.scheduleJob( job['cron'], function(){
			try{
				job['ins']( self,job );
				self.drv.update_Job( con.STA.RUN, job);
			}catch(e){
				console.log( "catch exception:" + e );
			}
			
		});
		job['status'] = true;

		self.drv.update_Job( con.STA.START, job);
		console.log( `-- run Job [ ${job['name']} ]`);	
	}
}

function stopJob( self, job ){
	if( job['status'] === true){
		console.log( `-- [ ${job['name']} ] stoping ...` );
		job['ins']( self,job, true );
		job['job'].cancel();
		job['status'] = false;
		console.log( `-- [ ${job['name']} ] stoped` );

		self.drv.update_Job( con.STA.STOP, job);
	}
}

function addJob( self, name,scCfg ){
	if( self.schedules[ name ] === undefined )
	{
		console.log( `add Job [ ${name} ]` );
		
		self.schedules[name] = {
			name:name,
			cron:scCfg['cron'],
			fun :scCfg['fun'],
			switch:scCfg['switch'],
			status:false,
			ins : null,   // 函数实例
			job:null     // jobID
		};

		return true;
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

	return false;
}
