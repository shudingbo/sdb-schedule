

const CornParser = require('cron-parser');

module.exports = function(sc,job, runStep){
	if( runStep === sc.jobStep.INIT ){
		return init( sc,job );
	}else if( runStep === sc.jobStep.RUN ){
		return run( sc,job );
	}else{
		return stop( sc,job );
	}
};


let g_cnt = 0;

function init( sc, job ){
	sc.logger.info( job['name'] + 'Next run Time' + CornParser.parseExpression(job['cron']).next() );
}

function run(sc, job)
{
	let tmp = 'disableRoom run 20002:' + g_cnt;
	let myCfg = sc.getConfig(job['name']);

	sc.logger.info( tmp,' --myCfg:',myCfg.roomID );
  g_cnt++;

	//sc.updateMsg( job['name'], "haha" );
  return tmp;
}

function stop(sc, job)
{
	sc.logger.info( 'disableRoom stop ' + 20002 );
	return;
}