'use strict';

module.exports = {
	STA:{
		RUN   :1,    // 运行
		START :2,
		STOP  :3,
		EXCEPTION:4   // exception
	},
	AddCode:{
		OK:1,  // add OK
		Exist:2, // job exist
		Exception:3  // add Exception
	},
	JobStep:{
		INIT:0,  // 初始化
		RUN:1,   // 运行
		STOP:2   // 停止
	}
};
