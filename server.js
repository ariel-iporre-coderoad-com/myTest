var express = require('express');
var app = express();
var fs = require("fs");


app.get('/listUsers', function (req, res) {
    fs.readFile(__dirname + "/" + "users.json", 'utf8', function (err, data) {
        console.log(data);
        res.end(data);
    });
});

app.put("/reboot", function (req, res) {
    var message = "---->>> :V  reboottinhh........ alles gut Freunde ";
    console.log(message)
    res.send(200, message )
});

app.get("/info", function (req, res) {
    var message = "Info:   Test server, with no content. O.o";
    console.log(message)
    res.send(200, message )
});


var server = app.listen(3000, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

});

