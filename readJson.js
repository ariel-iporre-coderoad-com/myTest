var fs = require('fs');
var target = '/home/ariel/Documents/Starflex/scripts/simple_program1.json';
var parse = function (cb) {
                fs.readFile(target, function (fsErr, data) {
                    if (fsErr) {
                        err = {
                            "developerMsg": "No such RFID program: " + target 
                        };
                        console.log(err);
                    }
                    else {
			try{
                            activeRFIDProgram = JSON.parse(data);
                            console.log('=====>>  Json file :' + JSON.stringify(activeRFIDProgram));
			}catch (e){
			    console.log('corrupted file.' + e.message)
			}
                    }
                });
            };
setInterval(function(){console.log('still running')},2000);

parse();
