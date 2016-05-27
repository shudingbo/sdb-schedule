


module.exports = function(sc,job,isStop){
	if( isStop === true ){
		stop( sc,job );
	}else{
		run( sc,job );
	}
};


var g_cnt = 0;
function run( sc,job)
{
    console.log( 'run ' + 20002222 );
	g_cnt++;
	
	console.log( job['name'] + "  " + g_cnt +" : " + job['cron'] );
	if( g_cnt > 10 ){
		sc.stopJob( job['name'] );  // example stop this job
	}
	
	if( g_cnt > 3 ){
		sc.updateJob( job['name'], {
			"cron":"*/2 * * * * *",
			"fun":"./sc/enableRoom.js",
			"switch":true
		});
	}
	
	
}

function stop(sc,job)
{
	console.log( 'stop ' + 20002222 );
}