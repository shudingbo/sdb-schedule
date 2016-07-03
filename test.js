



var sc = require("./lib/yz_schedule.js"); // -- you code here require is 'sdb_schedule'

/** File config Manager
var app = sc({ 
				'cfg_drv':'filedrv.js',
				'cfg_opt':{
					'cfgFile':"./config.json"
				}
			});
*/

/* redis config Manager*/
var app = sc({ 
	'cfg_drv':'redisdrv.js',
	'cfg_opt':{
		'host':"127.0.0.1",
		'port':6379,
		'keyPre':'sdb:schedule',
		'checkInterval':5000
	}
});



process.on('SIGINT', function () { 
	console.log('Got SIGINT. exit.');
	app.stop();
});



app.run();





