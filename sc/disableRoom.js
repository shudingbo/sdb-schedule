


module.exports = function(sc,job,isStop){
	//console.log( job );

	if( isStop === true ){
		return stop( sc,job );
	}else{
		return run( sc,job );
	}
};


var g_cnt = 0;
function run(sc, job)
{
	var tmp = 'disableRoom run 20002:' + g_cnt;
	var myCfg = sc.getConfig(job['name']);

    console.log( tmp,' --myCfg:',myCfg.roomID );
    g_cnt++;
    return tmp;
}

function stop(sc, job)
{
	console.log( 'disableRoom stop ' + 20002 );
	return;
}