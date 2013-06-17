sessions-plus
=============

Sessions plus authentication module for Node.js

### What it does

* Assigns a v4 UUID via cookie to each visitor
* Creates a req.session object
* All session data stored in req.session is loaded on visit for each visitor.

That's about it.

### Hooking the session

In order to hook the session into the user's req, you need to require the session-plus package:

    sessionsplus = require('sessions-plus');

And then append the following at the very start of your createServer function:

    req = sessionsplus.start(req);
    if(req.session.cookieFresh == 'true'){
        res.setHeader('Set-Cookie', 'uuid=' + req.session.cookie);
        req.session.cookieFresh = 'false';
    }

And append the following to the end of your createServer function:

    sessionsplus.end(req);

Simple.

### Killing a session

To wipe the contents of a session (IE: saved variables, login details, etc) you pass the req into the kill() function, like so:

    req = sessionsplus.kill(req);


