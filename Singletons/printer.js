
var instance = null;
var Printer;
Printer = function(){
    //throw SyntaxError('statusRestorer is an singleton : Use getInstance instead.');
    console.log("-->" + "PRIVATE" + "!!!!------>>   construction done:")
    this.code = Math.random();
};


Printer.prototype.printNew = function(caller) {
    console.log("-->" + caller + " ...:)  PRINTED");
    console.log("-->" + caller + "With code private" + this.code);
};

module.exports.getInstance = function () {
    // constructor
    console.log("-->: New Instance:  " + instance)
    if ( !instance ) {
        instance = new Printer;
    }
    return instance;
};

