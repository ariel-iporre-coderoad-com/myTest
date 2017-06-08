var Datastore = require('nedb');
var async = require('async');
var logger = require('winston');
var fs = require('fs');



var fileDB1 = '/home/ariel/Documents/Starflex/myTest/fileDB1.txt';
var fileDB2 = '/home/ariel/Documents/Starflex/myTest/fileDB2.txt';
var msg = "valor1";
var db = new Datastore({filename: fileDB1, autoload: true});
function a () {
    logger.info("file system module");
    fs.open(fileDB2, "w", function (errOpen, fd) {
        if(errOpen){
            logger.info("error writing with fs");
            return;
        }
        logger.info(" fd  = " + fd );
        fs.write(fd, "{\"asdf\" : \""+ msg +"\"}", undefined, undefined, function (errSync) {
            fs.close(fd, function (errClose) {
                if(errSync || errClose){
                    return logger.info("failed to write file.");
                } else {
                    return logger.info("file written and closed.");
                }
            });
        })

    });

}

function b () {
    logger.info("nedb system ");
    async.series([
       function (cb) {
           db.insert({asdf: msg}, function (err, newDoc) {
               if(!err){
                   logger.info("saved: " + JSON.stringify(newDoc));
               } else {
                   logger.info("failed to insert nedb");
               }
               cb();
           });
       },
        function (cb) {
            db.persistence.compactDatafile();
            setTimeout(function (){
                logger.info("------------------------- done");
                cb(null);
            }, 500);

        }
    ]);

}

// some code
a();
b();

var interval = setInterval(function () {
}, 1000);



