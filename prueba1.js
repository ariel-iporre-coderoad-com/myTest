const VERSION = '1.0.0-Beta31';

const _ = require('underscore'),
    request = require('request'),
    EventSource = require('eventsource'),
    Q = require('q'),
    mqtt = require('mqtt'),
    Nedb = require('nedb'),
    winston = require('winston'),
    fs = require('fs');

var config = {
    filterConfig: {
        reportInterval: 30,
        dwellTime: 45,
        lastZoneDetectedTimeout: 20,
        repetitionFilterExpiration: 300
    },
    powerSaving: {
        enabled: true,
        waitTimer: 5,
        stopTimer: 5
    },
    mqttRetryFailureInterval: 15,
    maxFailedReportToSaved: 1200,
    turnOnInterestingEvents: false,
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
    },
    backupDbTimer: 60,
    turnOnLogs: false
};

var sf = {
    secondsRunning: 0
};

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.File)({ filename: 'filters.log' })
    ]
});

var start = function () {
    var sse;
    logger.info('Starting filters program version: ' + VERSION + ' with program ' + config.rfidProgram);
    ZDPFilter.initialize(config.filterConfig);
    ZDPFilter.onFilter(function (tags) {
        MQTTHandler.publish(tags);
    });
    ZDPFilter.load();

    config.powerSaving.rfidProgram = config.rfidProgram;
    PowerSaving.initialize(config.powerSaving);

    cleanup().then(function () {
        return MQTTHandler.getConfig();
    }).then(function () {
        if (config.turnOnInterestingEvents) {
            API.connectMqtt(MQTTHandler.config.host, MQTTHandler.config.port);
        }
        MQTTHandler.connect();
        return API.createSubscription(config.subscriptionName, config.subscriptionSpec);
    }).then(function(){
        return API.takeControl({mqtt_data_publisher: "prueba1.js", mqtt_data_active: true}, function () {
                logger.info("--->> takes control !!!")
        })

    }).then(function () {
        throw new Error("dummy error");
        sse = starListenReadings(API.ip, config.subscriptionName);
        startFilterReadings();
        MQTTHandler.startRetryInterval(config.mqttRetryFailureInterval);
        return API.startProgram(config.rfidProgram);
    }).catch(function (error) {
        if (sse) { sse.close(); }
        MQTTHandler.end();

        //*******************
        API.takeControl({mqtt_data_publisher: "internal"}, function () {
                logger.info("--->> close take control !!!")});


        //********************
        logger.error('Exiting ' + error);
        process.exit(1);
    });
};

var cleanup = function () {
    logger.info('Clean up any unexpected conditions');
    return API.stopActiveProgram().then(function () {
        return API.disconnectMqtt();
    });
};

var starListenReadings = function(ip, subscriptionName) {
    var sse;
    var url = 'http://' + ip + '/rfid/events/' + subscriptionName + '?override';
    logger.info('Start listening SSE subscription to ' + url);
    sse = new EventSource(url);
    sse.addEventListener('mac_event', function(e) {
        var tags = JSON.parse(e.data);
        ZDPFilter.addToQueue(tags);
    });
    return sse;
};

var filtersDisabled = function () {
    return config.filterConfig.dwellTime === 0 && config.filterConfig.lastZoneDetectedTimeout === 0
        && config.filterConfig.repetitionFilterExpiration === 0 && config.filterConfig.reportInterval === 0;
};

var startFilterReadings = function () {
    logger.info('Start filter readings by evaluating rules on DB');
    setInterval(function() {
        sf.secondsRunning++;
        ZDPFilter.readQueue();
        ZDPFilter.evaluateRules();
        if (sf.secondsRunning % config.backupDbTimer === 0) {
            ZDPFilter.save();
        }
        PowerSaving.check(ZDPFilter.lastDetected);
    }, 1000);
};

var log = function (type, msg) {
    if (config.turnOnLogs) {
        if (type === 'info') {
            logger.info(msg);
        }
        if (type === 'error') {
            logger.error(msg);
        }
    }
};


/**
 * API all methods uses public API
 */
var API = {
    ip: '10.100.1.71',

    invokeAPI: function(method, url) {
        var me = this;
        var deferred = Q.defer();
        var options = {
            method: method,
            url: 'http://' + me.ip + '/' + url,
            headers: {
                'Content-Type': 'text/plain'
            }
        };
        request(options, function(err, resp, body) {
            if (err) {
                deferred.reject('ERROR invokeAPI: ' + err);
                return;
            }
            deferred.resolve({ statusCode:resp.statusCode, body: body });
        });
        return deferred.promise;
    },

    createSubscription: function (subscriptionName, subscription) {
        var me = this;
        logger.info('Creating subscription ' + subscriptionName);
        var deferred = Q.defer();
        var options = {
            method: "put",
            url: 'http://' + me.ip + '/rfid/subscription/' + subscriptionName,
            json: subscription
        };
        request(options, function(err, resp, body) {
            if (err) {
                deferred.reject('Cannot issue API call: ' + options.method + ' ' + options.url);
                return;
            }
            deferred.resolve({ statusCode: resp.statusCode, body: body });
        });
        return deferred.promise;
    },

    startProgram: function(program) {
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

    stopActiveProgram: function() {
        var me = this;
        return me.invokeAPI('DELETE', 'rfid/activeProgram').then(function (response) {
            if (response.statusCode != 200) {
                return Q.reject('Cannot delete /rfid/activeProgram from STARflex. Exiting');
            }
            log('info', 'Active program stopped');
            return Q.fulfill();
        });
    },

    disconnectMqtt: function() {
        var me = this;
        return me.invokeAPI('DELETE', 'config/mqtt').then(function (response) {
            if (response.statusCode != 200) {
                return Q.reject('Cannot disconnected /config/mqtt from STARflex. Exiting');
            }
            log('info', 'MQTT disconnected');
            return Q.fulfill();
        });
    },

    connectMqtt: function(host, port) {
        var me = this;
        log('info', 'Connect to mqtt ' + host + ':' + port);
        var deferred = Q.defer();
        var options = {
            method: "put",
            url: 'http://' + me.ip + '/config/mqtt?connect=true',
            json: { mqtt_host: host, mqtt_port: port }
        };
        request(options, function(err, resp, body) {
            //
            var response = {statusCode: resp.statusCode, body: body};
            log('info', 'Response: ' + JSON.stringify(response));
            //
            if (err) {
                deferred.reject('Cannot issue API call: ' + options.method + ' ' + options.url);
                return;
            }
            deferred.resolve({ statusCode: resp.statusCode, body: body });
        });
        return deferred.promise;
    },
//****************************************************************************
    takeControl: function (json) {
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
        var deferred = Q.defer();

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
                return;
            }
            deferred.resolve({ statusCode: resp.statusCode, body: body });
        });
        return deferred.promise;
    }
    //*****************************************************************************
};

/**
 * Power Saving based on stop and start rfid program
 */
var PowerSaving = {
    config: {
        enabled: true,
        waitTimer: 5,
        stopTimer: 5,
        rfidProgram: ''
    },
    lastDetected: + new Date(),
    handleFn: undefined,

    initialize: function (config) {
        this.config = _.extend(this.config, config);
    },

    check: function (lastDetected) {
        if (!this.config.enabled) { return; }
        var me = this,
            now = + new Date();
        me.lastDetected = lastDetected;
        if (((now - me.lastDetected) >= (me.config.waitTimer * 1000 + me.config.stopTimer * 1000)) && !me.handleFn) {
            // mode power saving ON
            log('info', 'Enter power saving ON, turning off rfid program');
            API.stopActiveProgram();
            me.handleFn = setTimeout(function () {
                log('info', 'Leaving power saving OFF, turning on rfid program');
                API.startProgram(me.config.rfidProgram);
                clearTimeout(me.handleFn);
                me.handleFn = undefined;
                ZDPFilter.lastDetected = + new Date();
            }, me.config.waitTimer * 1000);
        }
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
    failureDb: new Nedb({
        filename: 'dbFailedTags.db',
        autoload: true
    }),

    totalFailedReports: 0,
    processingReports: 0,

    getConfig: function () {
        var me = this;

        me.failureDb.count({ sent: false }, function (err, count) {
            logger.info('Total failed reports in DB ' + count);
            me.totalFailedReports = count;
        });

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

    connect: function () {
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
            log('error', 'mqttClient is reconnecting...');
        });
        me.mqttClient.on('close', function () {
            me.status = 'OFFLINE';
            log('error', 'mqttClient is close');
        });
        return me.mqttClient;
    },

    publish: function (tags) {
        var me = this;
        var payload = JSON.stringify(tags);

        var maxFailedReportToSaved = config.maxFailedReportToSaved;
        if (me.status === 'OFFLINE') {
            if (me.totalFailedReports < maxFailedReportToSaved) {
                log('error', 'System OFFLINE Report saved in db containing ' + tags.length + ' tags ' + ', total failed report ' + me.totalFailedReports );
                me.failureDb.insert({ sent: false, retry: 0, data: payload });
                me.totalFailedReports++;
            } else {
                log('error', 'Maximun failed report limit reached  ' + me.totalFailedReports + ' report will not saved :(');
            }
        } else if (me.status === 'CONNECTED') {
            me.mqttClient.publish(me.config.dataTopic, payload, function (err) {
                if (err) {
                    if (me.totalFailedReports < maxFailedReportToSaved) {
                        log('error', 'Error sending data to MQTT, saving in internal database for later retry ' + err);
                        me.failureDb.insert({ sent: false, retry: 0, data: payload });
                        me.totalFailedReports++;
                    } else {
                        log('error', 'Maximun failed report limit reached  ' + me.totalFailedReports + ' report will not saved :(');
                    }
                }
            });
        }
    },

    startRetryInterval: function (retrySeconds) {
        var me = this;
        setInterval(function () {
            if (me.status === 'OFFLINE') {
                log('error', 'MQTT OFFLINE cannot star retry-send MQTT process');
                return;
            }

            if (me.processingReports > 0) {
                log('error', 'startRetryInterval already processing ' + me.processingReports);
                return;
            }
            me.failureDb.find({ sent: false }, function (err, docs) {
                me.processingReports = docs.length;
                if (docs.length < 1) {
                    return;
                }
                var reportsSent = 0;
                log('info', 'Total failed report to retry ' + me.processingReports);
                _.each(docs, function(doc) {
                    me.mqttClient.publish(me.config.dataTopic, doc.data, null, function (err) {
                        me.processingReports--;
                        if (err) {
                            log('error', 'Error sending data to MQTT, updating number of retries ' + err);
                            me.failureDb.update({_id: doc._id}, { $inc: {retry:1} }, {}, function (err, numReplaced) {
                                if (numReplaced !== 1) {
                                    log('error', 'Error updating number of retries ' + err);
                                }
                            });
                        } else {
                            reportsSent++;
                            me.failureDb.remove({ _id: doc._id }, {}, function (err, numRemoved) {
                                if (numRemoved !== 1) {
                                    log('error', 'Error removing ' + err);
                                }
                            });
                        }
                    });
                });
                me.failureDb.persistence.compactDatafile();
                log('info', 'Total failed report sent ' + reportsSent);
            });
        }, retrySeconds * 1000);
    },
    end: function () {
        var me = this;
        if (me.mqttClient) { me.mqttClient.end(); }
    }
};


/**
 * Zone Dwell Perimeter Filter
 */
var ZDPFilter = {
    config: {
        reportInterval: 30,
        dwellTime: 60,
        lastZoneDetectedTimeout: 60,
        repetitionFilterExpiration: 300,
        filenameDb: 'dbTags.db'
    },
    cbPublish: function (tags) {},
    dbTags: {},
    queue: [],
    lastDetected: + new Date(),

    /**
     * Initialize the ZDPFilter
     * @param config JSON object, if one parameter is missing the default will use it
     */
    initialize: function (config) {
        this.config = _.extend(this.config, config);
    },

    /**
     * Whenever a tag or group tags are filter invoke call back
     * @param cbPublish
     */
    onFilter: function (cbPublish) {
        this.cbPublish = cbPublish;
    },

    /**
     * Add to queue to process accordingly in sequential order, the queue cannot grow more more than 2
     * this is the case when SSE producer is not synchronized with the interval
     * @param tags
     */
    addToQueue: function (tags) {
        var me = this;
        var max_queue = 2;
        if (me.queue.length < max_queue) {
            me.queue.push(tags);
        } else {
            me.queue[max_queue - 1] = _.uniq(_.union(me.queue[max_queue - 1], tags), false, function(item) {
                return item.data;
            });
        }
    },

    readQueue: function() {
        var me = this;
        if (me.queue.length < 1) { return; }
        var tags = me.queue[0],
            doc;
        _.each(tags, function(tag) {
            me.lastDetected = + new Date();
            if (me.config.repetitionFilterExpiration === 0) {
                // case RFE is disabled
                tag.filter = 'ZDF:FT';
                me.cbPublish([tag]);
            } else if (!me.dbTags[tag.data]) {
                // case first time ZDF rule
                me.dbTags[tag.data] = {
                    numberReads: 1,
                    reportInterval: 0,
                    dwellTime: 0,
                    expirationTimer: 0,
                    lastDetected: 0,
                    dwellActive: false,
                    data: tag.data,
                    alias: tag.alias,
                    tag: tag
                };
                tag.filter = 'ZDF:FT';
                me.cbPublish([tag]);
            } else {
                // Update with last timestamp reading
                doc = me.dbTags[tag.data];
                if (doc.tag.alias === tag.alias) {
                    doc.tag = tag;
                } else {
                    if (!doc.candidateTag || doc.candidateTag.alias !== tag.alias) {
                        // zone transition detected reset dwell time
                        doc.dwellTime = 0;
                        doc.dwellActive = true;
                    }
                    doc.candidateTag = tag;
                }
                doc.numberReads++;
                doc.data = tag.data;
                doc.previousAlias = doc.alias;
                doc.alias = tag.alias;
                doc.lastDetected = 0;

                // case Report Interval disabled: publish immediately
                if (me.config.reportInterval === 0) {
                    doc.tag.filter = 'RIF';
                    me.cbPublish([doc.tag]);
                    doc.reportInterval = 0;
                }
            }
        });
        me.queue.shift();
    },

    /**
     * Based on rules, it will filter and publish the tags
     */
    evaluateRules: function () {
        var me = this;
        var tags = [];
        if (filtersDisabled()) {
            _.each(me.dbTags, function(tuple) {
                tags.push(tuple.tag);
                delete me.dbTags[tuple.data];
            });
            if (tags.length > 0) {
                me.cbPublish(tags);
            }
            return;
        }
        _.each(me.dbTags, function(tuple) {

            // updating timers
            tuple.expirationTimer++;
            tuple.lastDetected++;
            if (tuple.dwellActive) { tuple.dwellTime++; }
            if (tuple.lastDetected < me.config.lastZoneDetectedTimeout || me.config.lastZoneDetectedTimeout === 0) {
                tuple.reportInterval++;
            }

            // check Last Zone Detected Timeout rule 5
            if (me.config.lastZoneDetectedTimeout !== 0 && tuple.lastDetected === me.config.lastZoneDetectedTimeout) {
                tuple.tag.filter = 'LZDF';
                tags.push(tuple.tag);
            }

            // check expirationTimer timeout rule 1 and rule 6
            if (tuple.expirationTimer >= me.config.repetitionFilterExpiration) {
                tuple.tag.filter = 'RFE';
                tags.push(tuple.tag);
                if (tuple.lastDetected > 1) {
                    // remove only when tag hadn't been read at same second
                    delete me.dbTags[tuple.data];
                } else {
                    // case tag is read at the same moment
                    tuple.expirationTimer = 0;
                    tuple.dwellActive = false;
                    tuple.reportInterval = 0;
                    tuple.lastDetected = 0;
                }
            }

            // check dwell time rule 3
            if (tuple.dwellActive && (tuple.dwellTime === me.config.dwellTime || me.config.dwellTime === 0)) {
                tuple.candidateTag.filter = 'ZDF';
                tags.push(tuple.candidateTag);
                tuple.tag = tuple.candidateTag;
                tuple.dwellActive = false;
                tuple.reportInterval = 0;
            }

            // check report interval rule 2
            if (!tuple.dwellActive && tuple.reportInterval === me.config.reportInterval && me.config.reportInterval !== 0
                && (tuple.lastDetected < me.config.lastZoneDetectedTimeout || me.config.lastZoneDetectedTimeout === 0)) {
                tuple.tag.filter = 'RIF';
                tags.push(tuple.tag);
                tuple.reportInterval = 0;
            }

            // check report interval rule 4
            if (tuple.dwellActive && tuple.reportInterval === me.config.reportInterval && me.config.reportInterval !== 0
                && (tuple.lastDetected < me.config.lastZoneDetectedTimeout || me.config.lastZoneDetectedTimeout === 0)
                && tuple.reportInterval > tuple.dwellTime) {
                tuple.tag.filter = 'RIF:B';
                tags.push(tuple.tag);
                tuple.tag = tuple.candidateTag;
                tuple.reportInterval = 0;
            }
        });
        if (tags.length > 0) {
            me.cbPublish(tags);
        }
    },

    /**
     * Load dbTAgs from file
     */
    load: function () {
        var me = this;
        fs.appendFileSync(me.config.filenameDb, '');
        var data = fs.readFileSync(me.config.filenameDb, 'utf8');
        if (data.length > 0) {
            try {
                me.dbTags = JSON.parse(data);
                logger.info('Loaded from file ' + me.config.filenameDb + ' ' + _.size(me.dbTags));
            } catch (e) {
                logger.error('dbTags.db was corrupted it will be remove on next backup ' + me.config.filenameDb);
            }
        }
    },

    /**
     * Save dbTags into a file
     */
    save: function () {
        var me = this;
        fs.writeFile(me.config.filenameDb, JSON.stringify(me.dbTags));
    }
};

start();