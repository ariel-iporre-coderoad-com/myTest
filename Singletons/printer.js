
/*
 * Fake Constructor
 * @constructor
 */
var Printer;
Printer = function(){
    throw SyntaxError('statusRestorer is an singleton : Use getInstance instead.');
};


/**
 * PROGRAM LOADER:
 * Program restorer saves status and launches last running program
 * @constructor
 */
var Instance = null;
function Constructor(){
    console.log("!!!!------>>   construction done:")
    this.code = "1234";
    Instance = this;
}


/**
 * getInstance of the Printer object
 */
Printer.prototype.getInstance = function () {
    // constructor
    console.log("New Instance:  " + Instance)
    return Instance || new Constructor();
};


/**
 * REPORT STATUS:
 * It builds an status report
 * @param type
 * @param callback
 */
Printer.prototype.printNew = function() {
    console.log(" ...:)  PRINTED");
    console.log("With code private" + this.code);
}

module.exports = Printer;