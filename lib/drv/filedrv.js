var fs = require('fs');
var path = require('path');
var con = require('../const.js'); 


module.exports = function(opt){
	return new FileDrv( opt );
};


var FileDrv = function( opt ){

	this._cb = null;

	this.cfgPath = './config.json';
	if( typeof opt.cfgFile === 'string'  ){
		this.cfgPath = path.resolve(opt.cfgFile);
	}

	///console.log( this.cfgPath );

}


/**
 * Start Monitor the schedule job's change.
 * 
 * @param  {Function} cb when schedule change,will trigger call this CB.
 * @return {[type]}      [description]
 */
FileDrv.prototype.start_monitor = function(cb){
	var self = this;

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
	console.log( 'update_Job : ', job['name'],handleType );
}



function cfgChange( self ){
	var cfg = JSON.parse(fs.readFileSync( self.cfgPath,'utf-8'));
	if( self._cb !== null ){
		self._cb( cfg.schedules );
	}
}



