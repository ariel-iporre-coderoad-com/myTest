//import library?
var http = require('http');
// creates server
http.createServer(function (req, res) {
	console.log("" + req);
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Hello World\n');
}).listen(3000);
//log to know that it's running....	
console.log('Server running at http://localhost:3000/');