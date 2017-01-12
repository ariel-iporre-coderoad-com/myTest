// modules
var request = require('request');
var Datastore = require('nedb');
var async = require('async');

/**
 * PROGRAM LOADER:
 * Program loader saves status and launches last running program
 * @constructor
 */
var ProgramLoader;
ProgramLoader = function () {
    // constructor
    this.fileDB = '/home/ariel/Documents/Starflex/myTest/statusDB';
    var last = null;
    var me = this;
    this.db = new Datastore({filename: this.fileDB, autoload: true});
    this.updatesLock = false;
    this.recoveryLock = true;
};


/**
 * REPORT STATUS:
 * It builds an status report
 * @param type
 * @param callback
 */
ProgramLoader.prototype.reportStatus = function (callback) {

    readVal = null;
    last = null;
    db = this.db;
    // Find last event with for the with the type 'type', eg rfid or mqtt
    db.find({type: "rfid"}).sort({time: -1}).limit(1).exec(function (err, docs) {
        readVal = docs;
        readVal.forEach(function (d) {
            last = d;
            console.log('Last event:', d);
        });
        config = null;
        db.find({type: "configuration"}, function (err, docs) {
            docs.forEach(function (d) {
                config = d;
            })
            var response = {
                programName: last.programName
                , running: last.running
                , type: "rfid"
                , updateLock: config.updatesLock
                , recoveryLock: config.recoveryLock
            };
            callback(response)
        });

    });

};


/**
 * RESTORE:
 * It launches last running program in the database
 * @param type
 */
ProgramLoader.prototype.restore = function (type, callback) {
    //It has to detemine if there was a RFID program running. It's done by reading the last event

    readVal = null;
    // Find last event with for the with the type 'type', eg rfid or mqtt
    if (!this.recoveryLock) {
        this.db.find({type: type}).sort({time: -1}).limit(1).exec(function (err, docs) {
            readVal = docs;

            launchProgram();

        });
        callback("Program Launched")
    } else {
        callback("Recovery is locked")
    }
    function launchProgram() {
        readVal.forEach(function (d) {
            last = d;
            console.log('Last event:', d);
        });
        // now we have the last value we determine whether or not to run it
        if (readVal.length > 0) {
            console.log("status is: " + last.running);
            if (last.running) {
                console.log('Launching....');
                run(last.programName)
            } else {
                console.log('Wasn\'t activated. We let it like that.');
            }
        } else {
            console.warn("None " + type + " event.")
        }
    }

    console.log("Reload program type: " + type);

    function run(programName) {
        console.log("Starting program: " + programName);
        var options = {
            method: "put",
            url: 'http://127.0.0.1:3000/rfid/activeProgram/' + programName
        }

        request(options, function (err, resp, body) {
            if (err) {
                console.error("Trouble issuing macstart, err: " + err);
            }
            else {
                console.info("Response: " + resp + " body: " + body);
            }
        });
    }
};

/**
 * Internal method that saves configuration
 */
ProgramLoader.prototype.persistConfiguration = function (doc, replaceKey, callback) {
    // db = new Datastore({filename: this.fileDB, autoload: true});
    db = this.db;
    db.update(replaceKey, doc, {upsert: true, multi: true}, function (err, numReplaced) {
        console.log('Inserting configuration ( numReplaced ' + numReplaced + ')...');
        db.find(replaceKey, function (err, docs) {
            readVal = docs;
            readVal.forEach(function (d) {
                console.log('Found :', d);
            });
        });
        if (err) {
            callback(null);
        } else {
            callback(doc);
        }
    });
};


ProgramLoader.prototype.refreshLocks = function (callback) {
    var me = this;
    var last = null;
    this.db.find({type: "configuration"}).sort({time: -1}).limit(1).exec(function (err, docs) {
        readVal = docs;
        readVal.forEach(function (d) {
            last = d;
            console.log('Last config:', d);
        });
        if (last) {
            console.log("New configuration found ");
            me.updatesLock = last.updatesLock;
            me.recoveryLock = last.recoveryLock;
        } else {
            console.log("No previous configuration has been found: " + last + ". Setting default")
        }
        callback()
    });
};
/**
 * LOCK RECOVER:
 * locks recover, that means recover is disable if lock is true and disable if lock is false
 * @param lockAction
 */
ProgramLoader.prototype.lockRecover = function (lockAction) {
    this.recoveryLock = lockAction;
    var doc = {
        configItem: "event"
        , type: "configuration"
        , updatesLock: this.updatesLock
        , recoveryLock: this.recoveryLock
        , time: new Date()
    };
    this.persistConfiguration(doc, {type: "configuration"}, function (a) {
        if (a) {
            console.log("Configuration successfully inplaced")
        } else {
            console.log("Failed to put recovery's lock in:  " + lockAction)
        }
    });
};


/**
 * LOCK UPDATE:
 * Changes flag to activate/deactivate updates.
 * @param lockAction
 */
ProgramLoader.prototype.lockUpdate = function (lockAction) {
    this.updatesLock = lockAction;
    var doc = {
        configItem: "event"
        , type: "configuration"
        , updatesLock: this.updatesLock
        , recoveryLock: this.recoveryLock
        , time: new Date()
    };
    this.persistConfiguration(doc, {type: "configuration"}, function (a) {
        if (a) {
            console.log("Configuration successfully inplaced")
        } else {
            console.log("Failed to put update's lock in:  " + lockAction)
        }
    });
};


/**
 * UPDATE:
 * change status to recover
 * @param currentStatus
 * @param programName
 * @param type
 * @param callback
 */
ProgramLoader.prototype.update = function (currentStatus, programName, type, callback) {

    console.log("Updating status of program : " + programName + " to " + currentStatus);
    var doc = {
        configItem: "event"
        , programName: programName
        , running: currentStatus == "run" ? true : false
        , time: new Date()
        , type: type
    };
    var readVal = null;

    console.log('inserting....');
    // verifies update active:

    var me = this;

    async.series([
            function (callback) {
                // do some stuff ...
                me.refreshLocks(function () {
                    callback(null)
                })
            },
            function (callback) {
                if (me.updatesLock) {
                    callback(null, "Updates are locked")
                } else {
                    me.persistConfiguration(doc, {programName: programName}, function (a) {
                        if (a) {
                            callback(null, doc);
                            console.log("Configuration successfully inplaced")
                        } else {
                            console.log("Failed to put update's lock in:  " + lockAction)
                            callback(null);

                        }
                    });
                }
            }
        ],
        // optional callback
        function (err, results) {
            // results is now equal to ['one', 'two']
            if(err){
                callback(err)
            }else {
                callback(results[1])
            }
        });
};


module.exports = ProgramLoader;