
var streamFlag = false;
var childProcess = require('child_process');
var async = require('async');

var context = {
    // brocker info,
    host: null,
    port: null,
    // client
    client: null,
    // loggers
    logSSE: null,
    logger: null,
    // topics
    reqTopic: null,
    respTopic: null,
    dataTopic: null,
    sseTopic: null,
    uploads: {},
    restorer : null
}
/**
 *
 * @param restorer
 * @param cback
 */
module.exports.setRestorer = function (restorer, cback) {
    context.restorer = restorer;
    cback();
}

module.exports.setLogger = function (logger) {
    context.logger = logger;
}


/**
 *
 * @returns {Function}
 */
module.exports.launchMethod = function () {
    return function (readVal, type) {
        context.logger.info("Auto-recovery: Mqtt status to lunch  " + JSON.stringify(readVal))
        var  last = null;
        readVal.forEach(function (d) {
            last = d;
            context.logger.info('Auto-recovery: Last mqttClient event detected '+ d);
        });
        if (readVal.length > 0) {
            if (last.active) {
                context.logger.info("Auto-recovery: Launching mqttClient-stream " + last.targetName + ", which was running before restart.");
                if(context.client){
                    context.client.publish(context.reqTopic,JSON.stringify(last.recoveryData))
                }else{
                    context.logger.info("publish is not null");
                }
            } else {
                context.logger.info('Auto-recovery: It has been detected the mqttClient-stream \"' + last.targetName + '\" in the last event but It wasn\'t running. Stream won\'t be started.');
            }
        } else {
            context.logger.warn("Auto-recovery: No MQTT-Stream detected running or stoped in the memory.")
        }
    };

};

module.exports.reportStreaming = function () {
    var streamingStatus = {};
    streamingStatus["connectionActive"] = module.exports.isConnected();

    if(streamFlag && streamingStatus.connectionActive) {
        streamingStatus["topicDataActive"] = true;
        streamingStatus["host"] = context.host;
        streamingStatus["port"] = context.port;
    }

    return streamingStatus;
}

module.exports.isConnected = function () {
    if(context.client) {
        return context.client.connected;
    }
    return false;
}

module.exports.destroySubscription = function (){
    childProcess.exec('/usr/bin/killall mqttClient', function (error, stdout, stderr) {
        module.exports.updateRecoverInFalse()
    })

}


module.exports.updateRecoverInFalse = function () {
    context.logger.info("Auto-recovery: Removed mqtt connection. Updating restorer.");
    streamFlag = false;
    context.restorer.update(false, "", "mqtt", {}, function (err, result) {
        context.logger.info("Auto-recovery: mqtt-client stop command. " + result);
    })
}

module.exports.stop = function () {
    context.logSSE.info("Ending existing MQTT connection");
    context.client.end();
    delete context.client;
    if(context.client == null){
        module.exports.updateRecoverInFalse();
    }
}

module.exports.stopIfActive = function () {
    if (module.exports.isConnected()) {
        module.exports.stop();
    }else {
        module.exports.updateRecoverInFalse();
    }
}

module.exports.rfidEventsRequestHandler = function (mqttReq) {
    var urlList = mqttReq.cmd.split('/');

    async.series([
        // Stop any existing tag read pubs to MQTT
        function(cb) {
            context.logger.info("Stopping any existing mqttClient");
            childProcess.exec('/usr/bin/killall mqttClient', function(error, stdout, stderr) {
                cb(null);
            })
        },
        function (cb) {
            //Update restorer
            context.logger.info("Auto-recovery: MQTT update mqtt status")
            streamFlag = true;
            context.restorer.update(true, mqttReq.cmd, "mqtt", mqttReq, function (err, result) {
                context.logger.info("Update mqtt status result: " + result)
                cb(null);
            })
        },
        // Exec new mqttClient
        function(cb) {
            var cmd = "/usr/bin/mqttClient";
            var args = ["--host " + context.host,
                " --port " + context.port,
                " --topic " + context.dataTopic,
                " --infotopic " + context.sseTopic
            ];

            if (urlList.length > 2) {
                args.push(" --subscription " + urlList[2]);
            }
            context.logger.info("Forking new mqttClient: " + cmd);
            var child = childProcess.spawn(cmd);

            child.stdout.on('data', function(data) {
                context.logger.info('SPAWN: standard out ' + data);
            });

            child.stderr.on('data', function(data) {
                context.logger.info('SPAWN: standard error ' + data);
            });

            child.on('close', function(code) {
                context.logger.info('SPAWN: child process exited with code ' + code);
                module.exports.destroySubscription();
                cb(null);
            });

            child.on('error', function (error) {
                context.logger.warn("Problem instantiating mqttClient: " + error)
                cb(error)
            });
        }
    ]);
}
