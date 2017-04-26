var Printer = require('./printer');

var printer = Printer.getInstance("app");
var secondPrinterUser = require('./secondSingletonUser');

console.log("app: started my application");

printer.printNew("app");
secondPrinterUser.doYourStuff("app");
