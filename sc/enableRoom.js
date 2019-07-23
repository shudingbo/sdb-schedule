
const CornParser = require('cron-parser');

module.exports = function(sc,job, runStep){
	sc.logger.info( '------- in ',job['name']);

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
			let parName = job.parent['name'];
			sc.updateMsg( parName, '停止房间！' );
			sc.stopJob( job['name'],'关闭房间' );
			return {};
		}
	}

};


let g_cnt = 0;

function init( sc, job ){
	sc.logger.info( job['name'] + ': Next run Time: ' + CornParser.parseExpression(job['cron']).next() );
}


function run( sc,job)
{
	let {app} = sc;

  sc.logger.info( `run 20002222 , ${app.test++}` );
	g_cnt++;
	
	sc.logger.info( job['name'] + "  " + g_cnt +" : " + job['cron'] );
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
			"cron": Date.now()+10000,
			"switch":true,
			"parent":job['name']
		});

		sc.runJob( 'subJob' );

	}

	if( g_cnt == 15 ){
		sc.removeSubJob('subJob');
	}

	return 'Run OK';
}

function stop(sc,job)
{
	sc.logger.info( 'stop ' + 20002222 );
}