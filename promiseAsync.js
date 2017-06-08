var Q = require('q');

var myPromise = function(){
	return Q.promise(function(resolve, reject){
		setTimeout(function(){
			console.log('promise resolved');
			resolve('value took from the promise')
		}, 1000)
	});
};




var functionThatUsesPromise = function() {
	var response = {};

	response['valor sincrono '] = 'value sync';
	myPromise().then(function(val){
		console.log('finished to resolve promise');
		response['promise value '] = 'promise value ==>' + val;
	});

	return response;
};


var res = functionThatUsesPromise();
console.log(" function that uses promise response: " + JSON.stringify(res));