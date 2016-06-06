
# Simple schedule framework
[中文看这里]

## Installation

Using npm:

    $ npm install sdb-schedule

To run the tests:

    $ node test.js

## Description
This is schedule framework base **[node-schedule]**. Through a simple configuration, you can control schedule jobs.
This module provides follow function:

 - Cron format string config schedule
 - Can dynamic control tasks on/off/update
 - Config and task script can In any position

### Changelog

#### 1.0.4
Add RedisDrv(Redis configuration manager module),using [node-redis];

#### 1.0.3
Refactor the code, separate configuration management module. Now can easy support. Are now able to support more than one type of configuration file management more easily. For example, using the **File/Redis/SQL** Server storage management plan task configuration File.
 - Add File Config module support.



## Configuration AND Configuration file Manager
### Configuration
  Configuration file using the json format, defined the schedules,as shown below:
```javascript
{
	"schedules":{
		"enableRoom":{
			"cron":"*/5 * * * * *",
			"fun":"./sc/enableRoom.js",
			"switch":true
		},
		"disableRoom":{
			"cron":"*/5 * * * * *",
			"fun":"./sc/disableRoom.js",
			"switch":false
		}
	}
}
```

All job defined in **schedules** fields, each job define as json object,must have 3 fields:(cron,fun and switch).

  - **cron** , define job cron string.
  - **fun**  , is the node function module, called when the time of arrival
  - **switch**, switch,told sdb-schedules on/off this job

The cron format consists of:
```
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    |
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
```
#### Unsupported Cron Features

Currently, `W` (nearest weekday), `L` (last day of month/week), and `#` (nth weekday
of the month) are not supported. Most other features supported by popular cron
implementations should work just fine.

[cron-parser] is used to parse crontab instructions.

### configure manager
Since version 1.0.3, profile management as a separate module, the default now provides a kind of configuration file management module (FileDrv), you can extend the configuration file management module based on the requirements, such as using redis configuration management module.
We can create the sdb-schedule by the incoming parameters, using the configuration management module specified:

```javascript
var app = sc({
				'cfg_drv':'filedrv.js',
				'cfg_opt':{
					'cfgFile':"./config.json"
				}
			});
```
 - **cfg_drv**,Specify the use of configuration file management module;
 - **cfg_opt**,Specify the parameters of the configuration file management module, when  construct configuration file management module,passed it as parameter.

#### FileDrv ( File Configuration Manager Module)
Using file manager the configuration. 

cfg_opt:
 - **cfgFile**,Config file path;



#### RedisDrv ( Redis Configuration Manager Module)
Using Redis manager the configuration. [node-redis]

cfg_opt:
 - **host**, redis server's host;
 - **port**, redis server's port;
 - **keyPre**, redis key's pre;
 - **checkInterval**, check config interval, mill sec;


## API
I am schedule framework, have two part:Frame and JobPlugin.

 - **[Frame](#frame)**, admin the Job Plugin.
 - **[Job Plugin](#jobplugin)**, Implement the schedule Job work.

 Work flow like this:

 1. `var sc = require("sdb-schedule"); `  Require module sdb-schedules.
 1. `var app = sc( { 'cfg_drv':'filedrv.js','cfg_opt':{} });` Construct sc object and give her ths config file path.
 1. `app.run();` Call run() start work.
 1. `app.stop();`  Stop work.

### Frame
 - [run()](#run), start schedules.
 - [stop()](#stop), stop schedules.
 - [updateJob(name,scCfg)](#updatejob), add/update schedule job.
 - [runJob(name)](#runjob), run job by name.
 - [stopJob(name)](#stopjob), stop job by name.

#### run
Run all job that *switch* is `true`.  
No parames.

#### stop
Stop all job.
No parames.

#### updateJob
`updateJob(name,scCfg )`

 - **name**, Job's name, string.
 - **scCfg**, Job's cfg.
```javascript
    {
    	"corn":<* * * * * * *>,
        "fun":"",
        "switch":true|false
    }
```
 Update Job，
 - If cron or fun has change,and the job is running,then restart job.
 - If job not run,only change the config.
 - If job not exist, add new job,but can't run it ,you must manual run it( call runJob );


#### runJob
`runJob(name)`

 - **name**, Job's name, string.

#### stopJob
`stopJob(name)`

 - **name**, Job's name, string.

### JobPlugin
Job Plugin,is node module, export as function has three parames.
`module.exports = function(sc,job,isStop){}`

 - ** sc **, instance of sdb-schedule, you can call function
 - ** job **, this job info
 - ** isStop **, true means this is stop callback,you can clear resource and so on.

The following is a complete example, example demonstrates the following features:

 - Dynamically change the task properties
 - Stop the task

```javascript
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

```

## Copyright and license

Copyright 2016+ shudingbo

Licensed under the **[MIT License]**.

[node-schedule]: https://github.com/node-schedule/node-schedule
[cron-parser]: https://github.com/harrisiirak/cron-parser
[node-redis]:https://github.com/NodeRedis/node_redis
[中文看这里]:https://github.com/shudingbo/sdb-schedule/wiki/Chinese
