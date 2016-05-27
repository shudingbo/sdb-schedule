
var schedule = require('node-schedule');
var fs = require('fs');
var path = require('path');


module.exports = function( cfgPath ){
	return new YZSchedule( cfgPath);
};


var YZSchedule = function( cfgPath ){
	var self = this;

	this.schedules = {};
	this.cfgPath = './config.json';
	if( typeof cfgPath === 'string'  ){
		this.cfgPath = path.resolve(cfgPath);
	}


	console.log( 'start init ...');



	///
	fs.watchFile( this.cfgPath, (curr, prev) => {
	  if( curr.mtime !== prev.mtime ){
	  	check( self );
	  }
	});

	/// load config file
	var cfg = JSON.parse(fs.readFileSync( this.cfgPath,'utf-8'));
	init( this, cfg.schedules );
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




function init( self, scCfg ){
	//console.log( scCfg, this.schedules);

	for( var sc in scCfg ){
		addJob( self, sc, scCfg[sc] );
	}
}



function onExit( self ){

	fs.unwatchFile( self.cfgPath );

	for( var job in self.schedules ){
		stopJob( self, self.schedules[job]);
	}

	console.log('exit ...');
}


function check( self ){
	var cfg = JSON.parse(fs.readFileSync( self.cfgPath,'utf-8'));
	for( sc in cfg.schedules ){
		var jobCfg = cfg.schedules[sc];
		var ret = addJob( self, sc, jobCfg );
		if( ret === true ){
			if( jobCfg['switch'] === true ){
				runJob( self.schedules[sc] );
			}
		}else{ // already has this job
			var thisJob = self.schedules[sc];
			if( jobCfg['switch'] === true && thisJob['status']=== false ){
				runJob(thisJob);
			}else if( jobCfg['switch'] === false && thisJob['status']=== true ){
				stopJob(self, thisJob);
			}
		}

	}
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
			}catch(e){
				console.log( "catch exception:" + e );
			}
			
		});
		job['status'] = true;

		console.log( `-- run Job [ ${job['name']} ]`);	
	}
}

function stopJob( self, job ){
	if( job['status'] === true){
		console.log( `-- [ ${job['name']} ] stoping ...` );
		job['job'].cancel();
		job['status'] = false;
		console.log( `-- [ ${job['name']} ] stoped` );	
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
