# 简洁计划任务框架

![Setting][idSet]

## 安装

Using npm:

    $ npm install sdb-schedule

To run the tests:

    $ node test.js

## 描述
	ver 2.0.0 至少需要 node 8.9.0

本模块是一个简洁的计划任务框架模块（基于**[node-schedule]**）。 你只需要简单的配置，就可以获得功能强大的计划任务控制功能。此模块提供了下列功能：
 - 使用 Cron 格式 灵活的配置计划任务
 - 可以在执行中，动态控制计划任务的开/关/更新
 - 任务的配置脚本可以放在系统任意位置。

## APP(UI)
现在我们实现了一个APP [sdb-schedule-ui],用于管理schedule( 只支持 redis drv ),你可以在这里下载 [download].
- 基于 Eletron 实现

## 插件
### 自动清理Redis数据插件( scp-cleanRedis )
自动清理Redis数据。参见文档 [scp-cleanRedis]。
- 支持正则表达式
- 支持 清理 ZSET,LIST

### 更新记录

#### 2.0.1
针对 模块的 可嵌入性 做了下列修改
- 增加配置参数
 - **logger**，统一logger输出，方便嵌入其它组件
 - redis驱动
	- **instanse**, 可以使用存在的 redis 连接实例
- sc构造函数，增加参数 parModule，传入对象，方便模块使用，这个对象会传入各个 Job，方便Job使用. 可以在 <job>.js 里通过sc.app,调用parModule的数据
```
const g_redis = { 
	ins:null      // required, redis instanse
};
cfg_opt:{
  instanse: g_redis
}
```

#### 2.0.0
- 使用 ioredis 替换 node-redis
- 使用 ES6 语法

#### 1.1.5
- Fix bug: 任务执时间 < 1 m, Next Run Time calc error 

#### 1.1.3
- 改变 stopJob 函数,增加 msg 参数.
- 修复Bug

#### 1.1.2
- 修复Bug，下一次运行时间显示错误

#### 1.1.1
* Sub Job （子Job）
	> Job 支持增加 子Job的功能（updateSubJob ）,Job 可以创建 多个 子Job，子Job可以通过函数 removeSubJob 进行移除。
    > Job 和 子Job 共用一个处理模块

#### 1.1.0
- 改变 Job 的导出函数参数定义, isStop 参数 更新为 runStep
  - 0, 初始化 job
  - 1, 运行 job
  - 2, 停止 job
- 针对 redis 驱动，增加Job的下y运行时间属性。 


#### 1.0.11
- 增加 updateMsg 函数, 现在 Job 可以在工作流程里调用 sc.updateMsg 来更新 Job 的运行消息。

#### 1.0.10
- 修复Bug，当设置错误的 cron 字符串时，通知任务会导致异常.

#### 1.0.9
- 支持包含 node_modules 目录下的模块，配置时只需要把 Fun 参数配置为 模块名称。 

#### 1.0.8
- 实现功能 #4,可以单独编辑Job的配置

#### 1.0.6
修复 #1

#### 1.0.5
修复 使用RedisDrv时，Job启动计时记录不正确的问题。

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
let parModule = {
	test:123456,
};
let logger = {
	info:(msg)=>{ console.log('--- [sche info]:',msg); },
	warn:(msg)=>{ console.log('--- [sche warn]:',msg); }
};

const app = sc({
				'cfg_drv':'filedrv.js',
				'cfg_opt':{
					'cfgFile':"./config.json"
				},
				logger
			},parModule);
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
 - **instanse**, for redis drv

## API
I am schedule framework, have two part:Frame and JobPlugin.

 - **[Frame](#frame)**, admin the Job Plugin.
 - **[Job Plugin](#jobplugin)**, Implement the schedule Job work.

 Work flow like this:

 1. `const sc = require("sdb-schedule"); `  Require module sdb-schedules.
 1. `const app = sc( { 'cfg_drv':'filedrv.js','cfg_opt':{} });` Construct sc object and give her ths config file path.
 1. `app.run();` Call run() start work.
 1. `app.stop();`  Stop work.

### Frame
 - [run()](#run), 启动计划任务管理.
 - [stop()](#stop), 停止计划任务管理.
 - [updateJob(name,scCfg)](#updatejob), add/update schedule job.
 - [runJob(name)](#runjob), 运行指定名称的工作任务.
 - [stopJob(name,msg)](#stopjob), 停止指定名称的工作任务.
 - [getConfig(name)](#getConfig), 获取名称的工作任务的配置.
 - [updateMsg(jobname,msg)](#updateMsg), 更新工作任务的运行状态消息.
 - [updateSubJob(name,scCfg)](#updateSubJob), add/update schedule sub job.
 - [removeSubJob(name)](#removeSubJob), remove sub job.

#### Run
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
`stopJob(name,msg)`

 - **name**, Job's name, string.
 - **msg**, stop message, string.

#### getConfig
`getConfig(name)`

 - **name**, Job's name, string.
 - **return**, json's format object.

#### updateMsg
`updateMsg(jobname,msg)`

 - **name**, Job's name, string.
 - **msg**, the string message.

#### updateSubJob
`updateSubJob(name,scCfg )`

 - **name**, Sub Job's name, string.
 - **scCfg**, Job's cfg.
```javascript
    {
    	"corn":<* * * * * * *>,
        "switch":true|false
		"parent":<parent job's name>
    }
```

#### removeSubJob
`removeSubJob(name )`

 - **name**, Sub Job's name, string.


### JobPlugin
Job Plugin,是一个单独的node模块，直接作为函数导出，必须包含三个参数：
`module.exports = function(sc,job,isStop){}`

 - **sc**, sdb-schedule 对象实例，你可以通过它调用 提供的相关函数；
 - **job**, json对象，当前任务的相关信息；
 - **isStop**, boolean类型，true 表示是任务停止启动的回调；false 表示是任务运行的回调.
 - ***return 'msg string'***, 字符串，函数可以返回一个字符串，用于标记任务执行的具体情况。 如果使用了 RedisDrv 配置管理器R，这个消息将会被记录到redis，您可以通过查询redis，检测任务具体的执行信息。

下面是一个完整的例子，例子说明了下列特色：

 - 动态改变任务属性
 - 自己停止自己

```javascript
module.exports = function(sc,job,isStop){
	if( isStop === true ){
		return stop( sc,job );
	}else{
		return run( sc,job );
	}
};

let g_cnt = 0;
function run( sc,job)
{
	let {app} = sc;
  console.log( 'run ' + 20002222, app.test );
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
[node-redis]:https://github.com/NodeRedis/node_redis
[cron-parser]: https://github.com/harrisiirak/cron-parser
[sdb-schedule-ui]: https://github.com/shudingbo/sdb-schedule-ui
[download]: https://github.com/shudingbo/sdb-public/blob/master/sdb-schedule-ui/sdb-schedule-ui.7z
[idMain]: https://github.com/shudingbo/sdb-public/blob/master/sdb-schedule-ui/main.jpg  "Main"
[idSet]: https://github.com/shudingbo/sdb-public/blob/master/sdb-schedule-ui/setting.jpg  "Setting"
[scp-cleanRedis]: https://github.com/shudingbo/scp-cleanRedis