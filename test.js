



var sc = require("./lib/yz_schedule.js"); // -- you code here require is 'sdb_schedule'
var app = sc( './config.json');



process.on('SIGINT', function () { 
	console.log('Got SIGINT. exit.');
	app.stop();
});



app.run();


