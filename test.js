



var sc = require("sdb-schedule");
var app = sc( './config.json');



process.on('SIGINT', function () { //SIGINT这个信号是系统默认信号，代表信号中断，就是ctrl+c
	console.log('Got SIGINT. exit.');
	app.stop();
});



app.run();


