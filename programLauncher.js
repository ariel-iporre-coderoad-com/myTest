/**
 * Created by ariel on 1/19/17.
 */
var logger = require('winston');
var request = require('request');

module.exports.launchProgram = function (readVal, type) {
    readVal.forEach(function (d) {
        last = d;
        logger.info('Auto-recovery: Last event detected ', d);
    });
    if (readVal.length > 0) {
        if (last.active) {
            logger.info("Auto-recovery: Launching program " + last.targetName + ", which was running previous restart.");
            run(last.targetName)
        } else {
            logger.info('Auto-recovery: It has been detected the program \"' + last.targetName + '\" in the last event but It wasn\'t running. Program won\'t be lauched.');
        }
    } else {
        logger.warn("Auto-recovery: None program has been registered running or stoped in the database.")
    }
}

function run(targetName) {
    var options = {
        method: "put",
        url: 'http://127.0.0.1:3000/rfid/activeProgram/' + targetName
    }
    request(options, function (err, resp, body) {
        if (err) {
            logger.error("Auto-recovery: Trouble issuing macstart, err: " + err);
        }
        else {
            logger.info("Auto-recovery: rest-call response: " + resp + " body: " + body);
        }
    });

}