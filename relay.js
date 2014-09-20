var WebSocketServer = require('websocket').server,
    http = require('http'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path');

var clients = {};

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}


/**
 * possible options:
 * - options.port: port on which to listen (defaults to 8080)
 * - options.url: URL to open in Chrome
 * - options.outputDir: directory in which to write trace file (defaults to working directory)
 */
function start(options) {
    var port = options.port ? options.port : 8080;
    var url = options.url ? options.url : "";
    var outputDir = options.outputDir ? options.outputDir : ".";
    var server = http.createServer(function(request, response) {
        console.log((new Date()) + ' Received request for ' + request.url);
        response.writeHead(404);
        response.end();
    });
    server.listen(port, function() {
        console.log((new Date()) + ' Server is listening on port 8080');
    });

    var wsServer = new WebSocketServer({
        httpServer: server
    });
    wsServer.on('request', function(request) {
        if (!originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
            return;
        }

        var name;
        var index;
        var connection = request.accept(null, request.origin);

        console.log((new Date()) + ' Connection accepted.');

        connection.on('message', function(message) {
            var msg, clientList, myName;
            if (message.type === 'utf8') {
                console.log("Received:"+message.utf8Data);
                msg = JSON.parse(message.utf8Data);

                // new client sends {resister:<clientName>}
                if ((myName = msg.register) !== undefined) {
                    if ((clientList = clients[myName]) === undefined) {
                        clients[myName] = clientList = [];
                    }
                    index = clientList.push(connection) - 1;
                    name = myName;
                } else if (msg.to !== undefined) {
                    // client sends {to:<receiver>, data:<data>}
                    if (clients[msg.to]) {
                        clients[msg.to].forEach(
                            function (to) {
                                var tmp;
                                // relayed message {from:<sender>, data:<data>}
                                to.sendUTF(tmp = JSON.stringify({"from": name, "data": msg.data}));
                                console.log("Sent:"+tmp);
                            }
                        );
                    }
                }
                connection.sendUTF("done");
            }
        });
        connection.on('close', function(reasonCode, description) {
            (clients[name]).splice(index, 1);
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected. '+reasonCode+" "+description);
        });
    });
}

exports.start = start;

if (require.main === module) {
    // TODO what is 'host' for?  kill it?
    var host = (process.argv[2]) ? process.argv[2] : "127.0.0.1";
    var port = process.argv[3];
    var url = process.argv[4];
    start({port : port, url: url});
}



