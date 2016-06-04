# 简洁计划任务框架
## 安装

Using npm:

    $ npm install sdb-schedule

To run the tests:

    $ node test.js

## 描述

本模块是一个简洁的计划任务框架模块（基于**[node-schedule]**）。 你只需要简单的配置，就可以获得功能强大的计划任务控制功能。此模块提供了下列功能：
 - 使用 Cron 格式 灵活的配置计划任务
 - 可以在执行中，动态控制计划任务的开/关/更新
 - 任务的配置脚本可以放在系统任意位置。

### 更新记录
#### 1.0.3
重构代码，独立配置文件管理为单独的模块。现在能够更容易支持多个类型的配置文件管理。例如 使用 File/Redis/sql Server 存储管理计划任务的配置文件。
 - 增加 文件类型 配置文件管理模块。

## 配置

  配置文件是一个json格式的文件，定义了每个计划任务，结构大致如下:

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

## API
I am schedule framework, have two part:Frame and JobPlugin.

 - **Frame**, admin the Job Plugin.
 - **Job Plugin **, Implement the schedule Job work.

 Work flow like this:

 1. `var sc = require("sdb-schedule"); `  Require module sdb-schedules.
 1. `var app = sc( './config.json');` Construct sc object and give her ths config file path.
 1. `app.run();` Call run() start work.
 1. `app.stop();`  Stop work.

### Frame
 [run()](#idFunRun), start schedules.
 [stop()](#idFunStop), stop schedules.
 [updateJob(name,scCfg)](#idFunUpdateJob), add/update schedule job.
 [runJob(name)](#idFunRunJob), run job by name.
 [stopJob(name)](#idFunStopJob), stop job by name.

####<span id="idFunRun">run</span>####
Run all job that *switch* is `true`.  
No parames.

####<span id="idFunStop">stop</span>####
Stop all job.
No parames.

####<span id="idFunUpdateJob">updateJob</span>####
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


####<span id="idFunRunJob">runJob</span>####
`runJob(name)`

 - **name**, Job's name, string.

####<span id="idFunStopJob">stopJob</span>####
`stopJob(name)`

 - **name**, Job's name, string.

### Job Plugin
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