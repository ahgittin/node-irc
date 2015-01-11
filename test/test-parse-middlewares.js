var util = require('util');

var test = require('tape');

var irc = require('../lib/irc');
var colors = require('../lib/colors');
var MockIrcd = require('./mockircd');

test('filter message middleware', function(t) {
    var client, mock, expected;

    mock = MockIrcd();
    client = new irc.Client('localhost', 'testbot', {});

    client.enableParseMiddleware(function(line) {
        if (line.indexOf('NODEBOT TEST MESSAGE') === -1) {
            return line;
        }
        return '';
    });

    expected = {
        sent: [
            ['NICK testbot', 'Client sent NICK message'],
            ['USER nodebot 8 * :nodeJS IRC client', 'Client sent USER message'],
            ['QUIT :node-irc says goodbye', 'Client sent QUIT message']
        ],

        received: [
            [':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n', 'Received welcome message']
        ]
    };

    t.plan(expected.sent.length + expected.received.length);

    mock.server.on('connection', function() {
        mock.send(':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n');
        mock.send(':localhost 001 testbot :Welcome to the NODEBOT TEST MESSAGE testbot\r\n');
    });

    // The middleware should filter out the second welcome message, so if the registered event
    // is called more than once, the test will fail due to more tests than planned being run
    client.on('registered', function() {
        t.equal(mock.outgoing[0], expected.received[0][0], expected.received[0][1]);
        client.disconnect();
    });

    mock.on('end', function() {
        var msgs = mock.getIncomingMsgs();

        for (var i = 0; i < msgs.length; i++) {
            t.equal(msgs[i], expected.sent[i][0], expected.sent[i][1]);
        }
        mock.close();
    });
});

test('stripColor middleware with option', function(t) {
    var client, mock, expected, colorMessages = [], colorNames = [];

    mock = MockIrcd();
    client = new irc.Client('localhost', 'testbot', {stripColors: true});
    colorNames = Object.keys(colors.codes);

    expected = {
        sent: [
            ['NICK testbot', 'Client sent NICK message'],
            ['USER nodebot 8 * :nodeJS IRC client', 'Client sent USER message'],
            ['QUIT :node-irc says goodbye', 'Client sent QUIT message']
        ],

        received: [
            [':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n', 'Received welcome message']
        ],

        messageText: []
    };

    colorNames.forEach(function(name) {
        expected.received.push([
            util.format(':jirwin!~jirwin@unaffiliated/jirwin PRIVMSG ##node-irc %s%s\r\n', colors.codes[name], name),
            util.format('Received message with %s color code in it', name)
        ]);

        expected.messageText.push([name, util.format('%s color code was properly stripped', name)]);
    });

    mock.server.on('connection', function() {
        mock.send(':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n');
    });

    client.on('registered', function() {
        t.equal(mock.outgoing[0], expected.received[0][0], expected.received[0][1]);
        colorNames.forEach(function(name) {
            mock.send(util.format(':jirwin!~jirwin@unaffiliated/jirwin PRIVMSG ##node-irc %s%s\r\n', colors.codes[name], name));
        });
        client.disconnect();
    });

    client.on('message', function(from, to, text, type, message) {
        colorMessages.push(text);
    });

    mock.on('end', function() {
        var msgs = mock.getIncomingMsgs();

        t.equal(msgs.length, expected.sent.length, 'Sent the same number of messages to the IRC server as we expected');
        for (var i = 0; i < msgs.length; i++) {
            t.equal(msgs[i], expected.sent[i][0], expected.sent[i][1]);
        }

        t.equal(colorMessages.length, expected.messageText.length,
                'Received the same number of color messages as we expected');
        for (i = 0; i < colorMessages.length; i++) {
            t.equal(colorMessages[i], expected.messageText[i][0], expected.messageText[i][1]);
        }

        t.end();
        mock.close();
    });
});

test('stripColor middleware manually added', function(t) {
    var client, mock, expected, colorMessages = [], colorNames = [];

    mock = MockIrcd();
    client = new irc.Client('localhost', 'testbot', {});
    colorNames = Object.keys(colors.codes);

    client.enableParseMiddleware(colors.stripColors);

    expected = {
        sent: [
            ['NICK testbot', 'Client sent NICK message'],
            ['USER nodebot 8 * :nodeJS IRC client', 'Client sent USER message'],
            ['QUIT :node-irc says goodbye', 'Client sent QUIT message']
        ],

        received: [
            [':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n', 'Received welcome message']
        ],

        messageText: []
    };

    colorNames.forEach(function(name) {
        expected.received.push([
            util.format(':jirwin!~jirwin@unaffiliated/jirwin PRIVMSG ##node-irc %s%s\r\n', colors.codes[name], name),
            util.format('Received message with %s color code in it', name)
        ]);

        expected.messageText.push([name, util.format('%s color code was properly stripped', name)]);
    });

    mock.server.on('connection', function() {
        mock.send(':localhost 001 testbot :Welcome to the Internet Relay Chat Network testbot\r\n');
    });

    client.on('registered', function() {
        t.equal(mock.outgoing[0], expected.received[0][0], expected.received[0][1]);
        colorNames.forEach(function(name) {
            mock.send(util.format(':jirwin!~jirwin@unaffiliated/jirwin PRIVMSG ##node-irc %s%s\r\n', colors.codes[name], name));
        });
        client.disconnect();
    });

    client.on('message', function(from, to, text, type, message) {
        colorMessages.push(text);
    });

    mock.on('end', function() {
        var msgs = mock.getIncomingMsgs();

        t.equal(msgs.length, expected.sent.length, 'Sent the same number of messages to the IRC server as we expected');
        for (var i = 0; i < msgs.length; i++) {
            t.equal(msgs[i], expected.sent[i][0], expected.sent[i][1]);
        }

        t.equal(colorMessages.length, expected.messageText.length,
                'Received the same number of color messages as we expected');
        for (i = 0; i < colorMessages.length; i++) {
            t.equal(colorMessages[i], expected.messageText[i][0], expected.messageText[i][1]);
        }

        t.end();
        mock.close();
    });
});
