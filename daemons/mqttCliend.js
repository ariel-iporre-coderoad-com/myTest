var childProcess = require('child_process');
var logger = require('winston');

childProcess.exec('./messages', function (error, stdout, stderr) {
                logger.info("killall mqttClient stdout: " + stdout);
                logger.info("killall mqttClient stderr: " + stderr);
            });
