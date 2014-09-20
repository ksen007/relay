$(function () {
    "use strict";

    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var input = $('#input');
    var status = $('#status');

    // my name sent to the server
    var myName = "";
    var otherName = "";
    var isFirst = true;
    var isSecond = false;

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
            + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    // open connection
    var connection = new WebSocket('ws://127.0.0.1:8080');
    console.log("waiting ...");

    connection.onopen = function () {
        console.log("Connected");
        // first we want users to enter their names
        input.removeAttr('disabled');
        status.text('Choose name:');
        input.focus();
    };

    connection.onerror = function (error) {
        // just in there were some problems with conenction...
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
            + 'connection or the server is down.' } ));
    };

    // most important part - incoming messages
    connection.onmessage = function (message) {
        // try to parse JSON message. Because we know that the server always returns
        // JSON this should work without any problem but we should make sure that
        // the massage is not chunked or otherwise damaged.
        try {
            input.removeAttr('disabled').focus(); // let the user write another message
            var json = JSON.parse(message.data);
            console.log(message.data);
            addMessage(json.from, json.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            input.focus();
            return;
        }

    };

    /**
     * Send mesage when user presses Enter key
     */
    input.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }
            // send the message as an ordinary text
            if (isFirst) {
                isFirst = false;
                connection.send(JSON.stringify({"register":msg}));
                myName = msg;
                isSecond = true;
                input.attr('disabled', 'disabled');
                status.text('Receiver name:');
            } else if (isSecond) {
                isSecond = false;
                otherName = msg;
                status.text('Enter message:');
                input.focus();
            } else {
                connection.send(JSON.stringify({"to":otherName, "data":msg}));
                input.attr('disabled', 'disabled');
            }
            $(this).val('');
            // disable the input field to make the user wait until server
            // sends back response

        }
    });

    /**
     * This method is optional. If the server wasn't able to respond to the
     * in 3 seconds then show some error message to notify the user that
     * something is wrong.
     */
//    setInterval(function() {
//        if (connection.readyState !== 1) {
//            status.text('Error');
//            input.attr('disabled', 'disabled').val('Unable to comminucate '
//                + 'with the WebSocket server.');
//        }
//    }, 3000);

    /**
     * Add message to the chat window
     */
    function addMessage(sender, message) {
        content.prepend('<p>'+ sender + ' : ' + message + '</p>');
    }
});