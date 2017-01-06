// modules
var request = require('request');
var Datastore = require('nedb');


var ProgramLoader = function () {
    // constructor
    this.fileDB = './starProgramEvents.db';
}

ProgramLoader.prototype.restore = function (type) {

    //It has to detemine if there was a RFID program running. It's done by reading the last event

    db = new Datastore({filename: this.fileDB});
    db.loadDatabase(function (err) {    // Callback is optional
        // Now commands will be executed
    });
    readVal = null;
// Find last event with for the with the type 'type', eg rfid or mqtt
    db.find({type: type}).sort({time: -1}).limit(1).exec(function (err, docs) {
        readVal = docs;
        launchProgram();
    });
    function launchProgram() {
        readVal.forEach(function (d) {
            last = d;
            console.log('Last event:', d);
        });
        // now we have the last value we determine whether or not to run it
        if(readVal.length > 0 ){
            console.log("status is: " + last.running);
            if (last.running) {
                console.log('Launching....');
                run(last.programName)
            } else {
                console.log('Wasn\'t activated. We let it like that.');
            }
        }else{
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
}

ProgramLoader.prototype.update = function (currentStatus, programName, type) {
    db = new Datastore({filename: this.fileDB, autoload: true});


    console.log("updating status of program : " + programName + " to " + currentStatus);
    var doc = {
        configItem :"event",
        programName: programName
        , running: currentStatus == "run" ? true : false
        , time: new Date()
        , type: type
    };
    console.log("new document: " + doc);
    var readVal = null;

    console.log('inserting....');

    db.update({programName: programName}, doc, { upsert: true }, printEvents());

    function printEvents() {
        console.log('the events are....');
        db.find({programName: programName}, function (err, docs) {
            readVal = docs;
            readVal.forEach(function (d) {
                console.log('Found user:', d.time);
            });
        });
    }
}


module.exports = ProgramLoader;