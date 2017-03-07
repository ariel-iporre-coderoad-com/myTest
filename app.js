var ProgramLoader = require('./statusRestorer');
var restorer = new ProgramLoader();
var logger = require('winston');
var async = require('async');
var programLauncher = require('./programLauncher')
var mqttClient = require('./mqttClient')





async.series([
    function (cb) {
        restorer.reportStatus(function (response) {
            logger.info("Response: " +  response)
            cb(null);
        })
    },
    function (cb) {
        restorer.update(true, "/test/abc01", "mqtt", "recovery data", function (err, result) {
            logger.info("Update mqtt status result: " + result)
            cb(null);
        })
    },
    function (cb) {
        restorer.update(true, "/test/abc02", "mqtt", "recovery data", function (err, result) {
            logger.info("Update mqtt status result: " + result)
            cb(null);
        })
    },
    function (cb) {
        restorer.update(true, "/test/abc03", "mqtt", "recovery data", function (err, result) {
            logger.info("Update mqtt status result: " + result)
            cb(null);
        })
    },
    function (cb) {
        restorer.reportStatus(function (response) {
            logger.info("Response: " +  response)
            cb(null)
        })
    }
])








// mqttClient.setLogger(logger)
//
// mqttClient.setRestorer(restorer, function () {
//
// })
//
// mqttClient.stopIfActive();
// var mqttRequest = {
//     uuid : "76580d2f-510a-4c5a-8b3e-81202b148aa5",
//     method : "GET",
//     cmd : "rfid/events/asdf123"
// }
// mqttClient.rfidEventsRequestHandler(mqttRequest);




// restorer.lockRecover(false)
// restorer.lockUpdate(false)
// restorer.update(true, "abc1234", "rfid", {}, function(status){
//     console.log("callback in app: " + status)
//     restorer.lockUpdate(false)
// });
//
//
//
//  restorer.restore("mqttClient",function (response) {
//      logger.info("===========>> inside the callback of app. js  :" + response)
//  })
//
// restorer.update(true, "asdf", "rfid", {}, function(v){
// 	logger.info(v)
// })
//
// async.series([
//         function (cb) {
//             mqttClient.useLogger(logger);
//             cb(null)
//         },
//         function (cb) {
//             async.series([
//                 function (callback) {
//                     logger.info("Auto-recovery: Starting recovering previous state");
//                     restorer.reportStatus(function (response) {
//                         callback(null);
//                     })
//                 },
//                 function (callback) {
//                     mqttClient.setRestorer(restorer,function () {
//                         callback(null)
//                     });
//                 },
//                 function (callback) {
//                     restorer.injectRecoverMethod("rfid", programLauncher.launchProgram, function (fun) {
//                         logger.info("=------------2 the result is : " + fun)
//                         callback(null)
//                     });
//                 },
//                 function (callback) {
//                     restorer.restore("rfid", function (status) {
//                         logger.info(" Auto-recovery: " + status + ".")
//                         callback(null);
//                     })
//                 },
//                 function (callback) {
//                     restorer.injectRecoverMethod("mqtt",  mqttClient.launchMethod(), function (result) {
//                         logger.info("=------------1 the result is : " + result)
//                         callback(null)
//                     })
//                 },
//                 function (callback) {
//                     restorer.restore("mqtt",function(status) {
//                         logger.info("MQTT auto-recovery: " + status + ".")
//                         callback(null);
//                     })
//                 }
//             ], function (error, resp) {
//                 cb(null);
//             })
//         }
//     ],
//     function (err) {
//         if (err) {
//             logger.error("Bring up failure: " + err);
//             return;
//         }
//         else {
//             // led.mode("keepAlive");
//             logger.info("Bring up sequence completed.  SERVICE OPERATIONAL.");
//         }
//     });
//


