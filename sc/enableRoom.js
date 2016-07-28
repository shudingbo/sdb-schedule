
var CornParser = require('cron-parser');

module.exports = function(sc,job, runStep){
	console.log( '------- in ',job['name']);

	if( job['name'] !== 'subJob' ){
		if( runStep === 0 ){
			return init( sc,job );
		}else if( runStep === 1 ){
			return run( sc,job );
		}else{
			return stop( sc,job );
		}
	}else{
		if( runStep === 1 ){
			var parName = job.parent['name'];
			sc.updateMsg( parName, '停止房间！' );
		}
	}

};


var g_cnt = 0;

function init( sc, job ){
	console.log( job['name'] + ': Next run Time: ' + CornParser.parseExpression(job['cron']).next() );
}


function run( sc,job)
{
    console.log( 'run ' + 20002222 );
	g_cnt++;
	
	console.log( job['name'] + "  " + g_cnt +" : " + job['cron'] );
	if( g_cnt > 1000 ){
		sc.stopJob( job['name'] );  // example stop this job
	}
	
	if( g_cnt == 2 ){
		
		//sc.updateJob( job['name'], {
		//	"cron":"*/2 * * * * *",
		//	"fun":"./sc/enableRoom.js",
		//	"switch":true
		//});
		
		sc.updateSubJob( 'subJob',{
			"cron": (new Date()).valueOf()+15000,
			"switch":true,
			"parent":job['name']
		});

		sc.runJob( 'subJob' );

	}

	if( g_cnt == 7 ){
		sc.removeSubJob('subJob');
	}

	return 'Run OK';
}

function stop(sc,job)
{
	console.log( 'stop ' + 20002222 );
}