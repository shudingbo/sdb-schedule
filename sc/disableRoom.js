

var CornParser = require('cron-parser');

module.exports = function(sc,job, runStep){
	if( runStep === 0 ){
		return init( sc,job );
	}else if( runStep === 1 ){
		return run( sc,job );
	}else{
		return stop( sc,job );
	}
};


var g_cnt = 0;

function init( sc, job ){
	console.log( job['name'] + 'Next run Time' + CornParser.parseExpression(job['cron']).next() );
}

function run(sc, job)
{
	var tmp = 'disableRoom run 20002:' + g_cnt;
	var myCfg = sc.getConfig(job['name']);

    console.log( tmp,' --myCfg:',myCfg.roomID );
    g_cnt++;

	//sc.updateMsg( job['name'], "haha" );
    return tmp;
}

function stop(sc, job)
{
	console.log( 'disableRoom stop ' + 20002 );
	return;
}