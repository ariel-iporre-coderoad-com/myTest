var licMgr = require('../license');
var logger = require('winston');
var async = require('async');

licMgr.licensePrep("001F48C5924A", function () {
    logger.info('TEST: license done!!');
});

var licTest = {
    preparation: function (callback) {
        licMgr.licensePrep("001F48C5924A", function () {
            logger.info('TEST: license done!!');
        });
        callback("TEST: Second all good.");
    },
    standAlone: function (callback) {
        var msg = "Standalone lic : ";
        callback(msg + licMgr.entitled("standAlone"));
    },
    jurisdiction: function (callback) {
        var msg = "Jurisdiction lic : ";
        callback(msg + JSON.stringify(licMgr.entitled("Jurisdiction")));
    }
};

var run = function () {
    async.series([
        function (cb) {
            licTest.preparation(function (msg) {
                logger.info("All good: " + msg);
                setTimeout(function () {
                    cb(null);
                }, 100);
            });
        }
        // ,
        // function (cb) {
        //     licTest.jurisdiction(function (msg) {
        //         logger.info("All good: " + msg)
        //         cb(null);
        //     });
        // }
    ], function (err, res) {
        logger.info("-------------------------");
        logger.info("-------------------------");
        logger.info("--LIC INFO: > " + licMgr.licInfo);
        logger.info("-------------------------");
        logger.info("-------------------------");
    });

};

run();

//var assert = require('assert');
//var _ = require('underscore');
//
//describe('external description 1 ', function () {
//    it('dummy test', function () {
//        assert.equal(1, 3);
//    });
//});
