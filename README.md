
# Simple schedule framework
[中文看这里]

![Setting][idSet]

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

## APP(UI)
Now we implement an app [sdb-schedule-ui],using admin schedules( only support redis drv ),you can [download] it.
- Base Electron


## Plugin 
### scp-cleanRedis （ auto Clean redis data）
 Clean Redis Data. You Can See document from [scp-cleanRedis].
 - support regex
 - support clean ZSET,List  



### Changelog
#### 1.1.0
- Change job export function's parame, isStop change as runStep
  - 0, init job
  - 1, run job
  - 2, stop job 
- Add nexRunTime attr in job status for redis drv.

#### 1.0.11
- Add update Msg function, now job can call sc.updateMsg  set the message.

#### 1.0.10
- Fix Bug, when Job cron parse error, stop job should exception.

#### 1.0.9
- support require module in ./node_modules Path.  Using module in node_modules folder,you should only set the module's name in Fun Param.

#### 1.0.8
- Implement #4,Can Edid job's config.

#### 1.0.6
fixed #1

#### 1.0.5
fixed using RedisDrv，Job startTime/stopTime can't record.

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
 - [getConfig(name)](#getConfig), get the job's config.
 - [updateMsg(jobname,msg)](#updateMsg), update job'run message.

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

#### getConfig
`getConfig(name)`

 - **name**, Job's name, string.
 - **return**, json's format object.

#### updateMsg
`updateMsg(jobname,msg)`

 - **name**, Job's name, string.
 - **msg**, the string message.


### JobPlugin
Job Plugin,is node module, export as function has three parames.
`module.exports = function(sc,job,isStop){}`

 - **sc**, {object},instance of sdb-schedule, you can call function
 - **job**, {object},this job info
 - **isStop**,{boolean} ,true means this is stop callback,you can clear resource and so on.
 - ***return 'msg string'***, {string},function can return string msg. If you using RedisDrv,msg will record to redis,you can look it.

The following is a complete example, example demonstrates the following features:

 - Dynamically change the task properties
 - Stop the task

```javascript
module.exports = function(sc,job,isStop){
	if( isStop === true ){
		return stop( sc,job );
	}else{
		return run( sc,job );
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
    return 'Run OK';
}

function stop(sc,job)
{
	console.log( 'stop ' + 20002222 );
    return;
}

```

## Copyright and license

Copyright 2016+ shudingbo

Licensed under the **[MIT License]**.

[node-schedule]: https://github.com/node-schedule/node-schedule
[cron-parser]: https://github.com/harrisiirak/cron-parser
[node-redis]:https://github.com/NodeRedis/node_redis
[scp-cleanRedis]: https://github.com/shudingbo/scp-cleanRedis
[中文看这里]:https://github.com/shudingbo/sdb-schedule/blob/master/README-cn.md
[sdb-schedule-ui]: https://github.com/shudingbo/sdb-schedule-ui
[download]: https://github.com/shudingbo/sdb-public/blob/master/sdb-schedule-ui/sdb-schedule-ui.7z
[idMain]: https://github.com/shudingbo/sdb-public/blob/master/sdb-schedule-ui/main.jpg  "Main"
[idSet]: https://github.com/shudingbo/sdb-public/blob/master/sdb-schedule-ui/setting.jpg  "Setting"
