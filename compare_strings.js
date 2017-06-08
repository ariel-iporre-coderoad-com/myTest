/*
       READS a simple program
 */
var fs = require('fs');
var cmp =  require('./compare');

var obj = JSON.parse(fs.readFileSync('simple_program.json', 'utf8'));

cmp.change_not_valid(obj.header);
console.log("RESULTADO: " +  obj.header.allowOpenPortTx);
