


module.exports = function(sc,job,isStop){
	//console.log( job );

	if( isStop === true ){
		stop( sc,job );
	}else{
		run( sc,job );
	}
};



function run()
{
    console.log( 'disableRoom run ' + 20002 );
}

function stop()
{
	console.log( 'disableRoom stop ' + 20002 );
}