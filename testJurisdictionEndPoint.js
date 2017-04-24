var childProcess = require('child_process');
var logger = require('winston');
var request = require('request');
var express = require('express');
var app = express();


var licMgr = {
    entitled: function(){
        return "Jurisdiction";
    }
};

// var res = {
//     send : function (code, message) {
//         console.log("http: " + code + "//" + JSON.stringify(message));
//     }
// };
//
// var req = {
//     query : { reboot: 'false'},
//     params : { value : "0"}
// };




app.put('/config/jurisdiction/:value', function (req, res) {
    function reboot() {
        var options = {
            method: "put",
            url: 'http://127.0.0.1:3000/reboot'
        };
        request(options, function (err) {
            if (err) {
                logger.error("Trouble performing a reboot, err: " + err);
            }
        });
    };

    function changeJurisdiction() {
        var changeJurisdictionCommand = "echo " + value;
        //"sed -i -e 's/\"jurisdiction\": \"[0-9]\"/\"jurisdiction\": \"" + value + "\"/g' /etc/jurisdiction";
        var rebootNow = req.query.reboot !== 'false';
        childProcess.exec(changeJurisdictionCommand, function (error) {
            if (error) {
                logger.warn("Cannot change jurisdiction: " + error, "error");
                res.send(400, {"developerMsg": "Invalid jurisdiction value"});
            } else {
                logger.info("Jurisdiction was changed system to " + value);
                if (rebootNow) {
                    res.send(200, {"developerMsg": "jurisdiction changed, please wait while rebooting the device"});
                    reboot();
                } else {
                    res.send(200, {"developerMsg": "jurisdiction changed, to apply changes reboot the device"});
                }
            }
        });
    };

    function validate() {
        var error;
        if (!value || value.length !== 1 || isNaN(parseInt(value))) {
            error = {
                code: 400,
                message: {"developerMsg": "Invalid jurisdiction value"}
            };
        } else if (!licMgr.entitled("jurisdiction")) {//case inscensitive to lower case
            error = {
                code: 403,
                message: {"developerMsg": "Current licence doesn't enable to change jurisdiction"}
            };
        } else {
            error = null;
        }
        return error;
    }

    var value = req.params.value;
    error = validate();
    if (error) {
        res.send(error.code, error.message);
    } else {
        changeJurisdiction();
    }
});

app.put("/reboot", function (req, res) {
    var message = "---->>> :V  reboottinhh........ alles gut Freunde ";
    console.log(message)
    res.send(200, message )
});


var server = app.listen(3000, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

});
