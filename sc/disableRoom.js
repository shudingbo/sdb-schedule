


module.exports = function(sc,job,isStop){
	//console.log( job );

	if( isStop === true ){
		return stop( sc,job );
	}else{
		return run( sc,job );
	}
};


var g_cnt = 0;
function run()
{
	var tmp = 'disableRoom run 20002:' + g_cnt;
    console.log( tmp );
    g_cnt++;
    return tmp;
}

function stop()
{
	console.log( 'disableRoom stop ' + 20002 );
	return;
}