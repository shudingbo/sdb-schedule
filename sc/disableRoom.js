


module.exports = function(sc,job,isStop){
	enableRoom();
	if( isStop === true ){
		stop( sc,job );
	}else{
		run( sc,job );
	}
};



function run()
{
    console.log( 'run ' + 20002 );
}

function stop()
{
	console.log( 'stop ' + 20002 );
}