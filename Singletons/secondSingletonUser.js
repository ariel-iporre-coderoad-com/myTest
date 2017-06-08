/**
 * Created by ariel on 4/25/17.
 */
var Printer = require('./printer');
var p = Printer.getInstance();

module.exports.doYourStuff = function () {
    p.printNew("secondUser");
};