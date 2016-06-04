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
#### 1.0.4
实现 Redisdrv(redis 配置文件管理模块)，使用[node-redis]。

#### 1.0.3
重构代码，独立配置文件管理为单独的模块。现在能够更容易支持多个类型的配置文件管理。例如 使用 File/Redis/sql Server 存储管理计划任务的配置文件。
 - 增加 文件类型(FileDrv.js) 配置文件管理模块。

## 配置 及 配置 管理
### 配置文件
  配置文件采用json格式，定义了每个计划任务，结构大致如下:

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

所有的工作任务在**schedules**域进行定义，每一个任务都有一个json对象定义，必须包含下面3个域(cron，fun和switch)。

  - **cron** , 定义任务的 cron 格式的字符串。
  - **fun**  , 是一个nodejs函数模块，在计划任务触发时调用。
  - **switch**, 开关,告诉 sdb-schedules 是开还是关。

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

### 配置文件管理
自1.0.3版本起，配置文件管理作为了单独的模块，现在缺省提供了 文件类配置文件管理模块(FileDrv)，您可以根据需求扩展配置文件管理模块，例如使用redis 管理配置模块。
我们可以在创建sdb-schedule时通过传入参数，指定使用的配置管理模块：

```javascript
var app = sc({ 
				'cfg_drv':'filedrv.js',
				'cfg_opt':{
					'cfgFile':"./config.json"
				}
			});
```
 - **cfg_drv**，指定使用的配置文件管理模块；
 - **cfg_opt**，指定配置文件管理模块的参数，会在构造配置文件管理模块式，作为参数传入。

#### FileDrv ( File Configuration Manager Module)
Using file manager the configuration. 

cfg_opt:
 - **cfgFile**,Config file path;


#### RedisDrv ( Redis Configuration Manager Module)
Using Redis manager the configuration.

cfg_opt:
 - **host**, redis server's host;
 - **port**, redis server's port;
 - **keyPre**, redis key's pre;
 - **checkInterval**, check config interval, mill sec;


## API
I am schedule framework, have two part:Frame and JobPlugin.

 - **Frame**, admin the Job Plugin.
 - **Job Plugin **, Implement the schedule Job work.

 Work flow like this:

 1. `var sc = require("sdb-schedule"); `  Require module sdb-schedules.
 1. `var app = sc( { 'cfg_drv':'filedrv.js','cfg_opt':{} });` Construct sc object and give her ths config file path.
 1. `app.run();` Call run() start work.
 1. `app.stop();`  Stop work.

### Frame
 [run()](#idFunRun), 启动计划任务管理.
 [stop()](#idFunStop), 停止计划任务管理.
 [updateJob(name,scCfg)](#idFunUpdateJob), add/update schedule job.
 [runJob(name)](#idFunRunJob), 运行指定名称的工作任务.
 [stopJob(name)](#idFunStopJob), 停止指定名称的工作任务.

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
[node-redis]:https://github.com/NodeRedis/node_redis
[cron-parser]: https://github.com/harrisiirak/cron-parser