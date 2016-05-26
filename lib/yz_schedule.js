
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
		this.cfgPath = cfgPath;
		console.log( this.cfgPath );
	}


	
	console.log( 'start init ...');

	process.on('SIGINT', function () { //SIGINT这个信号是系统默认信号，代表信号中断，就是ctrl+c
  		console.log('Got SIGINT. exit.');
  		self.onExit();
	});

	///
	fs.watchFile( this.cfgPath, (curr, prev) => {
	  if( curr.mtime !== prev.mtime ){
	  	check( self );
	  }
	});

	/// load config file
	var cfg = JSON.parse(fs.readFileSync( this.cfgPath,'utf-8'));
	this.init( cfg.schedules );
};


YZSchedule.prototype.init = function( scCfg ){
	//console.log( scCfg, this.schedules);

	for( var sc in scCfg ){
		addJob( this, sc, scCfg[sc] );
	}
}



YZSchedule.prototype.run = function(){
	
	for( var job in this.schedules ){
		if( this.schedules[job]['switch'] === true ){
			runJob( this.schedules[job] );
		}

	}
}

YZSchedule.prototype.onExit = function(){

	fs.unwatchFile( this.cfgPath );

	for( var job in this.schedules ){
		console.log( '-- [ '+ job +' ] stoping ...' );
		stopJob(this.schedules[job]);
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
				stopJob(thisJob);
			}
		}

	}
}


function runJob( job ){
	if( job['status'] === false){
		var pwd = path.resolve(job['fun']);
		delete require.cache[pwd];

		var ins = require( job['fun'] );
		job['ins'] = ins;

		job['job'] = schedule.scheduleJob( job['cron'], job['ins']);
		job['status'] = true;

		console.log( `run Job [ ${job['name']} ]` );	
	}
}

function stopJob( job ){
	if( job['status'] === true){
		job['job'].cancel();
		job['status'] = false;
		console.log( `stop Job [ ${job['name']} ]` );	
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

			stopJob( thisJob );

			if( status === true ){
				runJob( thisJob );
			}

		}

	}

	return false;
}
