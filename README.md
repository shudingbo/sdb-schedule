# This is schedule framework

## Installation

Using npm:

    $ npm install cppMsg

To run the tests:

    $ node test.js

## Description
This is schedule framework base node-schedule. Through a simple configuration, you can control planning tasks.
This module provides follow function:
  - Can dynamic control tasks on/off/update
  - Config and task script can In any position

## configuration
  Edit the config.json, 

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

Format :
 <task name> :{"cron":<cron string>, "fun":<callback>, "switch":<true:false,control task on/off>} 

