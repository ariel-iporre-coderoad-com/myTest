var events =  require('events');
var eventEmitter = new events.EventEmitter();
var connectHandler = function connected(){
	console.log('connection successful');
	eventEmitter.emit('data_received');
};
eventEmitter.on('connection', connectHandler);
 
// Bind the data_received event with the anonymous function
eventEmitter.on('data_received', function(){
   console.log('data received succesfully.');
});

// Fire the connection event 
eventEmitter.emit('connection');

console.log("Program Ended.");