/*function Create(callback) {
  var isGreen = false;
  var isRunning = false;
  return { 
    getIsGreen   : function()  { return isGreen; },
    setIsGreen   : function(p) { isGreen = p; callback(isGreen, isRunning); },
    getIsRunning : function()  { return isRunning; },
    setIsRunning : function(p) { isRunning = p; callback(isGreen, isRunning); }
  };
}
//Now you could call this function and link the callback to execute go():

var traffic = Create(function(isGreen, isRunning) {
  if (isGreen && !isRunning) {
    go();
  }
});

function go() {
  console.log("funciona!!!")
};

traffic.setIsGreen(true);*/
/*
const Emitter = require('events').EventEmitter;
var ProcessMonitor  = function(){
    var name = 'asdfasdfasdfasdf'
    var emitter =  new Emitter();
    var privateMethod = function(){console.log("THIS IS A customMethod" +  name)};

    setInterval(function(){emitter.emit('firstMessage')}, 4000);

    return {
      'event': emitter,
      'customMethod': privateMethod
    };
};



monitor = new ProcessMonitor();
monitor.event.once('firstMessage', function() {console.log('FIRST MESSAGE ARRIVE')})


setInterval(function(){console.log("interval"); monitor.customMethod();}, 1000)




const Emitter = require('events').EventEmitter;

const myEmitter =  new Emitter();

console.log(myEmitter)

// Only do this once so we don't loop forever
myEmitter.once('event', function() {
  console.log('B');
});


myEmitter.on('event', function () {
  console.log('A');
});


myEmitter.emit('event');
myEmitter.emit('event');
console.log(myEmitter)
*/
const Emitter = require('events').EventEmitter;
var ProcessMonitor  = function(){
    this.name = 'asdfasdfasdfasdf';
    this.emitter =  new Emitter();
};

ProcessMonitor.prototype.update= function(){
  me = this;
  setInterval(function(){me.emitter.emit('firstMessage')}, 4000);
};

ProcessMonitor.prototype.customMethod = function (){
  console.log("This is custom program:  " +  this.name)
};

ProcessMonitor.prototype.listen = function (eventName, callback, oneTime){
  var abc = this.emitter.on(eventName, callback);
  console.log("ABC  " + typeof abc);

  if(oneTime == true) {
    console.log("============> true one time listener " + this.emitter);
    this.emitter.once(eventName, callback);
  } else {
    console.log("============> true normal listener " + this.emitter);
    this.emitter.on(eventName, callback);
  }
};



monitor = new ProcessMonitor();

monitor.listen('firstMessage', function() {console.log('FIRST MESSAGE ARRIVE')});
monitor.update();


setInterval(function(){console.log("interval"); monitor.customMethod();}, 1000);

