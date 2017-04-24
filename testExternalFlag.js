// const VERSION = '1.0.0-Beta31';

const _ = require('underscore'),
    request = require('request'),
    EventSource = require('eventsource'),
    Q = require('q'),
    mqtt = require('mqtt'),
    winston = require('winston'),
    fs = require('fs'),
    async = require('async');

var start = function () {
    async.series([
        function (cb) {
            cleanup().then(function () {
                logger.info("1");
                cb(null)
            });
        },
        function (cb) {
            MQTTHandler.getConfig().then(function () {
                logger.info("2");
                cb(null);
            })
        },
        function (cb) {
            API.connectMqtt(MQTTHandler.config.host, MQTTHandler.config.port)
                .then(function () {
                    logger.info("2.0")
                    cb(null);
                });
        },
        function (cb) {
            logger.info("2.1");
            MQTTHandler.connect(function () {
                logger.info("3");
                cb(null);
            });
        },
        function (cb) {
            logger.info("3.1");
            API.createSubscription(config.subscriptionName, config.subscriptionSpec, function () {
                logger.info("4");
                cb(null);
            });
        },
        function (cb) {
            API.startProgram(config.rfidProgram).then(function () {
                logger.info("5");
                cb(null);
            })
        },
        function (cb) {
            API.takeControl({mqtt_data_publisher: "external"}, function () {
                logger.info("--->> takes control !!!")
                cb(null);
            })
        },
        function (cb) {
            var sse = starListenReadings(API.ip, config.subscriptionName);
            API.takeControl({mqtt_data_active: true}, function () {
                logger.info(" -----> flag is on and streaming is on")
                setTimeout(function () {
                    throw new Error();
                    // sse.close();
                    logger.info(" ----->> close streaming");
                    cb(null);
                }, 10000);
            });
        },
        function (cb) {
            API.takeControl({mqtt_data_active: false}, function () {
                logger.info(" ---->> flag is false")
                setTimeout(function () {
                    cb(null);
                }, 10000);
            });
        },
        function (cb) {
            var sse = starListenReadings(API.ip, config.subscriptionName);
            API.takeControl({mqtt_data_active: true}, function () {
                logger.info("---->> flag is on again")
                setTimeout(function () {
                    sse.close();
                    logger.info(" ---->> close streaming");
                    cb(null);
                }, 10000);
            });
        }
    ], function (err, res) {
        API.takeControl({mqtt_data_publisher: "internal"}, function () {
            logger.info(" ============>> Control 'internal' ");
        });
        setTimeout(function () {
            logger.info('   Adios : ............ finished: ^__^  ' );
            process.exit(1);
        }, 10000);
    });
};


var config = {
    maxFailedReportToSaved: 1200,
    rfidProgram: 'bp',
    subscriptionName: 'bp',
    subscriptionSpec: {
        summarize: {
            TagReadData: {
                keys: ['data'],
                interval_sec: 1
            }
        },
        dataStream: {
            TagReadData: {
                type: true,
                timestamp: true,
                seqNum: true,
                txAntennaPort: true,
                txExpanderPort: true,
                transmitSource: true,
                data: true,
                alias: true
            }
        }
    }
};


var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({filename: 'filters.log'})
    ]
});

var starListenReadings = function (ip, subscriptionName) {
    var sse;
    var url = 'http://' + ip + '/rfid/events/' + subscriptionName + '?override';
    logger.info('Start listening SSE subscription to ' + url);
    sse = new EventSource(url);
    sse.addEventListener('mac_event', function (e) {
        var tags = JSON.parse(e.data);
        tags.forEach(function (tag) {
            MQTTHandler.publish(tags)
        });
    });
    return sse;
};

var cleanup = function () {
    logger.info("1");
    logger.info('Clean up any unexpected conditions');
    return API.stopActiveProgram().then(function () {
        return API.disconnectMqtt();
    });
};
//
var log = function (type, msg) {
    if (type === 'info') {
        logger.info(msg);
    }
    if (type === 'error') {
        logger.error(msg);
    }
    return;
};
//
//
/**
 * API all methods uses public API
 */
var API = {
    ip: '10.100.1.71',

    invokeAPI: function (method, url) {
        var me = this;
        var deferred = Q.defer();
        var options = {
            method: method,
            url: 'http://' + me.ip + '/' + url,
            headers: {
                'Content-Type': 'text/plain'
            }
        };
        request(options, function (err, resp, body) {
            if (err) {
                deferred.reject('ERROR invokeAPI: ' + err);
                return;
            }
            deferred.resolve({statusCode: resp.statusCode, body: body});
        });
        return deferred.promise;
    },

    createSubscription: function (subscriptionName, subscription, callback) {
        var me = this;
        logger.info('Creating subscription ' + subscriptionName);
        var options = {
            method: "put",
            url: 'http://' + me.ip + '/rfid/subscription/' + subscriptionName,
            json: subscription
        };
        request(options, function (err, resp, body) {
            if (err) {
                callback(err)
            } else {
                callback(null);
            }

        });
    },

    startProgram: function (program) {
        var me = this;
        return me.invokeAPI('PUT', 'rfid/activeProgram/' + program).then(function (response) {
            if (response.statusCode != 200) {
                logger.error('Cannot start program ' + program + ' Exiting');
                return Q.reject('Cannot put /rfid/activeProgram/' + program + ' from STARflex. Exiting');
            }
            log('info', program + ' program started');
            return Q.fulfill();
        });
    },

    stopActiveProgram: function () {
        var me = this;
        return me.invokeAPI('DELETE', 'rfid/activeProgram').then(function (response) {
            if (response.statusCode != 200) {
                return Q.reject('Cannot delete /rfid/activeProgram from STARflex. Exiting');
            }
            log('info', 'Active program stopped');
            return Q.fulfill();
        });
    },

    disconnectMqtt: function () {
        var me = this;
        return me.invokeAPI('DELETE', 'config/mqtt').then(function (response) {
            if (response.statusCode != 200) {
                return Q.reject('Cannot disconnected /config/mqtt from STARflex. Exiting');
            }
            log('info', 'MQTT disconnected');
            return Q.fulfill();
        });
    },

    connectMqtt: function (host, port) {
        var me = this;
        log('info', 'Connect to mqtt ' + host + ':' + port);
        var deferred = Q.defer();
        var options = {
            method: "put",
            url: 'http://' + me.ip + '/config/mqtt?connect=true',
            json: {mqtt_host: host, mqtt_port: port}
        };
        request(options, function (err, resp, body) {
            var response = {statusCode: resp.statusCode, body: body};
            log('info', 'Response: ' + JSON.stringify(response));
            if (err) {
                log('info', '----------_> error during ask conncetion ' + options.url);
                deferred.reject('Cannot issue API call: ' + options.method + ' ' + options.url);
                return;
            }
            log('info', '------------------> no error');
            deferred.resolve({statusCode: resp.statusCode, body: body});
        });
        log('info', 'returning from connect mqtt...........>> ');

        return deferred.promise;
    },

    takeControl: function (json, callback) {
        var me = this;
        logger.info("---------------------------------------");
        logger.info("----------  PUT CONFIG/MQTT  ----------");
        logger.info("---------------------------------------");
        var data = {};
        if(json.hasOwnProperty("mqtt_data_active") && json.hasOwnProperty("mqtt_data_publisher")){
            data["mqtt_data_publisher"] = json.mqtt_data_publisher;
            data["mqtt_data_active"] = json.mqtt_data_active;
        } else if (json.hasOwnProperty("mqtt_data_active")) {
            data["mqtt_data_active"] = json.mqtt_data_active;
        } else if(json.hasOwnProperty("mqtt_data_publisher")){
            data["mqtt_data_publisher"] = json.mqtt_data_publisher;
        } else {
            callback("No valid arguments in json control");
        }

        var options = {
            method: "put",
            url: 'http://' + me.ip + '/config/mqtt?connect=true',
            json: data
        };

        request(options, function (err, resp, body) {
            var response = {statusCode: resp.statusCode, body: body};
            // log('info', 'Response: ' + JSON.stringify(response));
            if (err) {
                deferred.reject('Cannot issue API call: ' + options.method + ' ' + options.url);
            }
            callback();
        });
    }
};


/**
 * MQTT module handler, support retries in case failures
 */
var MQTTHandler = {
    config: {
        host: undefined,
        port: undefined,
        dataTopic: undefined
    },
    status: 'OFFLINE', // OFFLINE or CONNECTED,
    mqttClient: undefined,
    totalFailedReports: 0,
    processingReports: 0,

    getConfig: function () {
        var me = this;

        return API.invokeAPI('GET', 'config/mqtt').then(function (response) {
            if (response.statusCode != 200) {
                return Q.reject('Cannot get /config/mqtt from STARflex. Exiting');
            }
            var config = JSON.parse(response.body);
            me.config.host = config.mqtt_host;
            me.config.port = config.mqtt_port;
            me.config.dataTopic = config.mqtt_topic_data;
            logger.info('Current MQTT configuration ' + me.config.host + ':' + me.config.port + ', ' + me.config.dataTopic);
            return Q.fulfill(me.config);
        });
    },

    connect: function (callback) {
        var me = this;
        var url = 'mqtt://' + me.config.host + ':' + me.config.port;
        log('info', 'Connecting to MQTT broker ' + url);
        me.mqttClient = mqtt.connect(url);

        me.mqttClient.on('error', function (err) {
            me.status = 'OFFLINE';
            log('error', 'mqttClient error ' + err);
        });
        me.mqttClient.on('offline', function () {
            me.status = 'OFFLINE';
            log('error', 'mqttClient is OFFLINE');
        });
        me.mqttClient.on('connect', function () {
            me.status = 'CONNECTED';
            log('info', 'mqttClient is CONNECTED');
        });
        me.mqttClient.on('reconnect', function () {
            log('error', 'mqttClient is reconnecting...: ' + url);
        });
        me.mqttClient.on('close', function () {
            me.status = 'OFFLINE';
            log('error', 'mqttClient is close');
        });
        log('info', "mqtt url: " + url);
        callback();
    },

    publish: function (tags) {
        var me = this;
        var payload = JSON.stringify(tags);

        var maxFailedReportToSaved = config.maxFailedReportToSaved;
        if (me.status === 'OFFLINE') {
            if (me.totalFailedReports < maxFailedReportToSaved) {
                log('error', 'System OFFLINE Report saved in db containing ' + tags.length + ' tags ' + ', total failed report ' + me.totalFailedReports);
                me.failureDb.insert({sent: false, retry: 0, data: payload});
                me.totalFailedReports++;
            } else {
                log('error', 'Maximun failed report limit reached  ' + me.totalFailedReports + ' report will not saved :(');
            }
        } else if (me.status === 'CONNECTED') {

            me.mqttClient.publish(me.config.dataTopic, payload, function (err) {
                if (err) {
                    if (me.totalFailedReports < maxFailedReportToSaved) {
                        log('error', 'Error sending data to MQTT, saving in internal database for later retry ' + err);
                        me.failureDb.insert({sent: false, retry: 0, data: payload});
                        me.totalFailedReports++;
                    } else {
                        log('error', 'Maximun failed report limit reached  ' + me.totalFailedReports + ' report will not saved :(');
                    }
                } else {
                    // logger.info('sent payload in topic ' + me.config.dataTopic);
                }
            });
        }
    },

};
//

start();