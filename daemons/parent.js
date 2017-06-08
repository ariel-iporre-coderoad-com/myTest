var childProcess = require('child_process');
var logger = require('winston');




Binary = function () {
		var running = false;
		var process;

		this.kill = function () {
            var deferred = Q.defer();
            childProcess.exec('/usr/bin/killall mqttClient', function (error, stdout, stderr) {
                logger.info("killall mqttClient stdout: " + stdout);
                logger.info("killall mqttClient stderr: " + stderr);
                error?  deferred.reject(stderr) : deferred.resolve(stdout);
            });
            return deferred.promise
        },
        this.run = function () {
            var cmd = "/usr/share/starlight.api/daemons/mqttClient";
            logger.info("Forking new mqttClient: " + cmd );

            var args = ["--host", '10.100.1.155', "--port", '1883', "--topic", '/data', "--infotopic", ""];

            process = childProcess.spawn(cmd, args);
            process.stdout.on('data', function (data) {
			    logger.info(Date.now() + ' SPAWN (' + mqttClientPID + '): standard out ' + data);
			    running = true;
			});

			process.stderr.on('data', function (data) {
			    logger.info(Date.now() + ' SPAWN (' + mqttClientPID + '): standard error ' + data);
			    running = false;
			});
            return process
        },
        this.status =  function(){
            // here the mqttBinary should report the status of the hidden binary using messages
            return running;
        }
    };

var binary = new Binary;

var child = binary.run();

var mqttClientPID = child.pid;

child.on('message', function (message) {
     logger.info(Date.now() + " ++> message from child: " +  message)
});

child.on('close', function (code){
    logger.info(Date.now() + ' close \'messages\' with code' + code) ;
});


setInterval(function(){
	logger.info(Date.now() + ' new second: ' +  Date.now() + '--->> Binary status: ' + binary.status())
}, 1000);



