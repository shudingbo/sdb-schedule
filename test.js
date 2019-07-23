'use strict';


const sc = require("./lib/yz_schedule.js"); // -- you code here require is 'sdb_schedule'
const ioredis = require('ioredis');


let parModule = {
	test:10000,
};

let logger = {
	info:(...msg)=>{ console.log('--- [sche info]:',...msg); },
	warn:(...msg)=>{ console.log('--- [sche warn]:',...msg); }
};

/** File config Manager */
// const app = sc({ 
// 		'cfg_drv':'filedrv.js',
// 		'cfg_opt':{
// 			'cfgFile':"./config.json"
// 		},
// 		logger
// 	}, parModule);
/** end file config */

/* redis config Manager*/
const g_redis = { ins:null};
const app = sc({
	cfg_drv:'redisdrv.js',
	cfg_opt:{
		//host:"127.0.0.1",
		host:"192.168.2.10",
		port:6379,
		keyPre:'sdb:schedule',
		checkInterval:5000,
		instanse: g_redis
	},
	logger
}, parModule);

g_redis.ins = new ioredis( {
	host:"192.168.2.10",
	port:6379
} );

g_redis.ins.on("error",function( err ){
	logger.warn("redis Error " + err);
});

/** end redis config  */

process.on('SIGINT', function () { 
	console.log('Got SIGINT. exit.');
	app.stop();
});



app.run();





