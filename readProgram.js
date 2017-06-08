/**
 * Created by ariel on 1/3/17.
 */
var fs = require('fs');

var activeRFIDProgram = {};
var target = './program.json';
fs.readFile(target, function(err,data) {
    activeRFIDProgram = JSON.parse(data);
    console.log(activeRFIDProgram);
    if(activeRFIDProgram.inventories.length == 0){
       console.log("ERROR, no inwventoriesf \n asdfas")
    }
});