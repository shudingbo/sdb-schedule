'use strict';

const fs = require('fs');
const path = require('path');
const con = require('../const.js'); 



let FileDrv = function( opt,sc ){

	this._cb = null;
	this.sc = sc;
	this.logger = sc.logger;

	this.cfgPath = './config.json';
	if( typeof opt.cfgFile === 'string'  ){
		this.cfgPath = path.resolve(opt.cfgFile);
	}
	// this.logger.info( this.cfgPath );
}


/**
 * Start Monitor the schedule job's change.
 * 
 * @param  {Function} cb when schedule change,will trigger call this CB.
 * @return {[type]}      [description]
 */
FileDrv.prototype.start_monitor = function(cb){
	let self = this;

	this._cb = cb;

	fs.watchFile( this.cfgPath, (curr, prev) => {
	  if( curr.mtime !== prev.mtime ){
	  	cfgChange( self );
	  }
	});

	cfgChange( self );
}


FileDrv.prototype.stop_monitor = function(){
	fs.unwatchFile( this.cfgPath );
}


/**
 * Update Job Status
 * @param  {int} handleType @see const.js STA.
 * @param  {object} job  job object
 * @return null
 */
FileDrv.prototype.update_Job = function( handleType, job){
	this.logger.info( 'update_Job : ', job.name,handleType );
}

/** Update Job's msg 
 * @param jobName Job's Name
 * @param msg  Update msg
 */
FileDrv.prototype.update_msg = function( jobName, msg )
{
	this.logger.info( 'update_Job msg : ', jobName, msg );
};

FileDrv.prototype.getConfig = function( jobName ){
	/*
	if( this.jobCfgs[ jobName ] !== undefined )
	{
		return this.jobCfgs[jobName];
	}
	*/
	return {};
}

FileDrv.prototype.removeJob = function( jobName ){
	return;
};


function cfgChange( self ){
	let cfg = JSON.parse(fs.readFileSync( self.cfgPath,'utf-8'));
	if( self._cb !== null ){
		self._cb( cfg.schedules );
	}
}


//
module.exports = function(opt,sc){
	return new FileDrv( opt,sc );
};

