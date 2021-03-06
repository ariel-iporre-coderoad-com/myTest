var Datastore = require('nedb');
var async = require('async');
var logger = require('winston');

//TODO: This Class must be implemented as a singleton
/**
 * PROGRAM LOADER:
 * Program restorer saves status and launches last running program
 * @constructor
 */
var StatusRestorer;
StatusRestorer = function () {
    // constructor
    this.fileDB = '/home/ariel/Documents/Starflex/myTest/statusDB';
    var last = null;
    var me = this;
    this.db = new Datastore({filename: this.fileDB, autoload: true});
    this.updatesAllowed = true;
    this.recoveryEnabled = true;
    logger.info(" Auto-recovery: Program Loader initialized");
    this.launchMethods = {};
};


/**
 * REPORT STATUS:
 * It builds an status report
 * @param type
 * @param callback
 */
StatusRestorer.prototype.reportStatus = function (cb) {
    var me = this;
    async.series([
        //compact database
        function (callback) {
            logger.info("------------------------- compating.....");
            me.db.persistence.compactDatafile();
            //Waiting compact acction.
            setTimeout(function (){
                logger.info("------------------------- done");
                callback();
            }, 500);
        },
        function (callback) {
            var lastProgram = null;
            me.db.find({type: "rfid"}).sort({time: -1}).limit(1).exec(function (err, docs) {
                docs.forEach(function (d) {
                    lastProgram = d;
                    logger.info("Auto-recovery: Last program registered " + JSON.stringify(lastProgram))
                });
                callback(null, lastProgram)
            });
        },
        function (callback) {
            var lastConfig = null;
            me.db.find({type: "configuration"}).sort({time: -1}).limit(1).exec( function (err, docs) {
                docs.forEach(function (d) {
                    lastConfig = d;
                    logger.info("Auto-recovery: Last recovery configuration registered: " + JSON.stringify(lastConfig))
                });
                callback(null, lastConfig);
            });
        },
        function (callback) {
            var lastMqtt = null;
            me.db.find({type: "mqtt"}).sort({time: -1}).limit(1).exec( function (err, docs) {
                docs.forEach(function (d) {
                    lastMqtt = d;
                    logger.info("Auto-recovery: Last mqtt status registered: " + JSON.stringify(lastMqtt))
                });
                callback(null, lastMqtt);
            });
        }
    ], function (err, result) {
        if (err) {
            cb(err);
        } else {
            var program = result[0];
            var config = result[1];
            var mqtt = result[2];
            var response = {};
            //Default state if no in memory
            response["programName"] = "";
            response["programRunning"] = false;
            response["mqttSendingData"] = false;
            // Updating the values
            program? response["programName"] = program.targetName : null;
            program? response["programRunning"] = program.active : null;
            mqtt? response["mqttSendingData"] = mqtt.active : null;
            var mqttSub = "";
            logger.info(mqtt);
            if(mqtt){
                mqtt.targetName.split("/")[2]? mqttSub = mqtt.targetName.split("/")[2]: null;
                mqtt && mqtt.active? response["mqttSubscriptionName"] = mqttSub : null;
            }
            response["recoveryMode"] = me.updatesAllowed? "lastState" : "fixedState";
            response["autoRecovery"] = me.recoveryEnabled;

            logger.info("Auto-recovery: Current recovery restorer status: " + JSON.stringify(response));
            cb(response);
        }
    });


};
/**
 * injectRecoverMethod
 * Receives methods to restore status for a given type.
 * @param type
 * @param cb
 */
StatusRestorer.prototype.injectRecoverMethod = function(type, launchMethod, cb){
    var me = this;
    this.launchMethods[type] = launchMethod;
    cb(launchMethod.type);
};

/**
 * RESTORE:
 * It launches last running program in the database
 * @param type
 */
StatusRestorer.prototype.restore = function (type, cb) {
    // Find last event with for the with the type 'type', eg rfid or mqtt
    // now we have the last value we determine whether or not to run it

    //It has to detemine if there was a RFID program running. It's done by reading the last event
    // modules

    var me = this;
    async.series([
            function (callback) {
                me.refreshLocks(function () {
                    callback(null, "Refresh recovery configuration successful");
                })
            },
            function (callback) {
                var readVal = null;
                if (me.recoveryEnabled) {
                    var msg = "";
                    me.db.find({type: type}).sort({time: -1}).limit(1).exec(function (err, docs) {
                        readVal = docs;
                        var launcher = me.launchMethods[type];
                        if(launcher){
                            try{
                                launcher(readVal, type);
                            }catch(err){
                                logger.info("ERROR: " + err.stack)
                            }
                            msg = "Program launched " + JSON.stringify(readVal);
                            callback(null, msg)
                        }else{
                            msg = "Launch method not found";
                            callback(null, msg)
                        }
                    });
                } else {
                    callback(null, "Recovery is disabled")
                }
            }
        ],
        function (err, result) {
            // logger.info("Recovery restore command result: " + result)
            cb(result[0] + ". " + result[1])
        });
};

/**
 * Internal method that saves configuration
 */
StatusRestorer.prototype.persistConfiguration = function (doc, replaceKey, callback) {
    // db = new Datastore({filename: this.fileDB, autoload: true});
    // logger.info("Saving new recovery (" + JSON.stringify(replaceKey) + ") configuration: " + JSON.stringify(doc));
    db = this.db;
    db.update(replaceKey, doc, {upsert: true, multi: false}, function (err, numReplaced) {
        logger.info('Inserting configuration ( numReplaced ' + numReplaced + ')...');
        db.find(replaceKey, function (err, docs) {
            readVal = docs;
            readVal.forEach(function (d) {
                logger.info('Saved recovery '+ replaceKey +':' + d);
            });
        });
        if (err) {
            callback(err);
        } else {
            callback(doc);
        }
    });
};

/**
 * Refresh lock configuration
 * @param callback
 */
StatusRestorer.prototype.refreshLocks = function (callback) {
    var me = this;
    var last = null;
    // logger.info("Refreshing recovery program restorer locks.");
    this.db.find({type: "configuration"}).sort({time: -1}).limit(1).exec(function (err, docs) {
        readVal = docs;
        readVal.forEach(function (d) {
            last = d;
            // console.log('Last config found during refreshing recovery\'s locks:', d);
        });
        if (last) {
            me.updatesAllowed = last.updatesAllowed;
            me.recoveryEnabled = last.recoveryEnabled;
        } else {
            logger.info("Auto-recovery: No previous configuration to the recovery has been found: " + last + ". Last configuration remains.");
        }
        callback()
    });
};
/**
 * LOCK RECOVER:
 * locks recover, that means recover is disable if lock is true and disable if lock is false
 * @param lockAction
 */
StatusRestorer.prototype.lockRecover = function (lockAction) {
    this.recoveryEnabled = !lockAction;
    var doc = {
        configItem: "event"
        , type: "configuration"
        , updatesAllowed: this.updatesAllowed
        , recoveryEnabled: this.recoveryEnabled
        , time: new Date()
    };
    this.persistConfiguration(doc, {type: "configuration"}, function (a) {
        if (a) {
            // logger.info("Configuration successfully inserted: " + JSON.stringify(a));
        } else {
            logger.info(" Auto-recovery: Failed to put recoveryDisable flag in:  " + lockAction);
        }
    });
};


/**
 * LOCK UPDATE:
 * Changes flag to activate/deactivate updates.
 * @param lockAction
 */
StatusRestorer.prototype.lockUpdate = function (lockAction) {
    this.updatesAllowed = !lockAction;
    var doc = {
        type: "configuration"
        , updatesAllowed: this.updatesAllowed
        , recoveryEnabled: this.recoveryEnabled
        , time: new Date()
    };
    this.persistConfiguration(doc, {type: "configuration"}, function (a) {
        if (a) {
            // logger.info("Configuration successfully inserted" + JSON.stringify(a));
        } else {
            logger.info("   Auto-recovery: Failed to put updateDisable flag in:  " + lockAction);
        }
    });
};


/**
 * UPDATE:
 * change status to recover
 * @param active
 * @param targetName
 * @param type
 * @param callback
 */
StatusRestorer.prototype.update = function (active, targetName, type, recoveryData, callback) {

    console.log("Updating status of program : " + targetName + " to active = " + active);
    var doc = {
        targetName: targetName
        , active: active
        , time: new Date()
        , type: type
        , recoveryData: recoveryData
    };
    var readVal = null;

    // verifies update active:

    var me = this;

    async.series([
            function (callback) {
                // do some stuff ...
                me.refreshLocks(function () {
                    callback(null, "Recovery configuration sucessfully refreshed.")
                })
            },
            function (callback) {
                if (me.updatesAllowed || type === "mqtt") {
                    me.persistConfiguration(doc, {type: type}, function (a) {
                        if (a) {
                            callback(null, "Last state has been updated successfully.");
                            logger.info("Auto-recovery: Program state (" + targetName + ") successfully inserted : " + JSON.stringify(a));
                        } else {
                            logger.warn("Auto-recovery: An error occurred during updating. " + err.toString());
                            callback(null, "Failed to put program with name " + targetName);

                        }
                    });
                } else {
                    callback(null, "Updates are disabled. Not possible to insert " + JSON.stringify(doc) + " .")
                }
            }
        ],
        // optional callback
        function (err, results) {
            if (err) {
                callback(err,null)
            } else {
                callback(null,results)
            }
        });
};


module.exports = StatusRestorer;