var fs = require('fs');

// -- Sessions folder; used to store active sessions.
var sessionsFolder = './sessions/';
// -- 

// -- Checks if folder exists in project where executed.
function initialChecks() {
    if(!fs.existsSync(sessionsFolder)) {
            fs.mkdirSync(sessionsFolder);
    }
}
// --

exports.start = function (req) {
    initialChecks();
    // Used to hook the req and start a session.

    // -- Initialise an empty req.session object
    req.session = {};
    // --

    // -- Loads cookies from req object
    var cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function( cookie ) {
      var parts = cookie.split('=');
      cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
    });
    fs.writeFile(sessionsFolder + req.session.cookie + '.json', JSON.stringify(req.session), function(err) {
        if(err) throw err;
    });
    // --

    // -- Makes sure the req.session object has a cookie value attached; either pre-existing or new.
    if(typeof cookies.uuid !== 'undefined'){
        req.session.cookieFresh = false;
        req.session.cookie = cookies.uuid;
    } else {
        req = refreshCookie(req);
    }
    // --

    // -- Loads pre-existing session data if it exists.
    if(typeof req.session.cookie !== 'undefined' && fs.existsSync(sessionsFolder + req.session.cookie + '.json')) {
        req.session = JSON.parse(fs.readFileSync(sessionsFolder + req.session.cookie + '.json', encoding='utf8'));
    }
    // --

    // -- Returns hooked req
    return req;
    // --
};

exports.end = function (req) {
    initialChecks();
    // Used to save the contents of req.session to file.

    // -- Writes stringified contents of the req.session object to a json file.
    fs.writeFile(sessionsFolder + req.session.cookie + '.json', JSON.stringify(req.session), function(err) {
        if(err) throw err;
    });
    // --

    return;
};

exports.kill = function (req) {
    initialChecks();
    // Used to delete the session file and effectively kill the user's session
    if(fs.existsSync(sessionsFolder + req.session.cookie + '.json')) {
        fs.unlinkSync(sessionsFolder + req.session.cookie + '.json');
    }

    newSession = {};
    newSession.cookie = req.session.cookie;
    req.session = newSession;

    return req;
};

// --

// -- Refresh cookie
function refreshCookie(req) {
    req.session.cookieFresh = true;
    req.session.cookie = b();
    return req;
}
// --

// -- Function to generate a UUID (v4 standard, see: https://www.ietf.org/rfc/rfc4122.txt). Used for session cookie.
function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}
// --
