var ProgramLoader = require('./statusRestorer');
var retorer = new ProgramLoader();
var logger = require('winston');
var async = require('async');
var programLauncher = require('./programLauncher')

// retorer.lockRecover(false)
// retorer.lockUpdate(false)
// retorer.update(true, "abc1234", "rfid", {}, function(status){
//     console.log("callback in app: " + status)
//     retorer.lockUpdate(false)
// });


retorer.injectRecoverMethod("rfid", programLauncher.launchProgram, function (fun) {
    if(fun === programLauncher.launchProgram){
        logger.info("alles gut");
    }else {
        logger.info("nicht gleich")
    }
} );

retorer.restore("rfid",function (response) {
    logger.info("===========>> inside the callback of app. js  :" + response)
})

