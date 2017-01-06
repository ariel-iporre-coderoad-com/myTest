var ProgramLoader = require('./programLoader');
var loader = new ProgramLoader();

// console.log("ACTIVATION 1: ");
// loader.update("run", "abc123", "rfid");
// // sleep(5000);
//
console.log("ACTIVATION 2: ");
loader.restore('rfid');
sleep(5000)
//
// console.log("DEACTIVATION 1: ");
// loader.update("kill", "basic", "rfid");
// sleep(5000)
//
// console.log("DEACTIVATION 2: ");
// loader.runRFID('rfid');
// sleep(5000);

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}




