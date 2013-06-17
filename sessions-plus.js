var fs = require('fs');

// -- Sessions folder; used to store active sessions.
var sessionsFolder = './sessions/';
// -- 

if(!fs.existsSync(sessionsFolder)) {
    fs.mkdirSync(sessionsFolder);
}


exports.start = function (req) {
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
    if(cookies.uuid){
        req.session.cookieFresh = 'false';
        req.session.cookie = cookies.uuid;
    } else {
        req.session.cookieFresh = 'true';
        req.session.cookie = b();
    }
    // --

    // -- Loads pre-existing session data if it exists.
    if(fs.existsSync(sessionsFolder + req.session.cookie + '.json')) {
        req.session = JSON.parse(fs.readFileSync(sessionsFolder + req.session.cookie + '.json', encoding='utf8'));
    }
    // --

    // -- Returns hooked req
    return req;
    // --
};

exports.end = function (req) {
    // Used to save the contents of req.session to file.

    // -- Writes stringified contents of the req.session object to a json file.
    fs.writeFile(sessionsFolder + req.session.cookie + '.json', JSON.stringify(req.session), function(err) {
        if(err) throw err;
    });
    // --

    return;
};

exports.kill = function (req) {
    // Used to delete the session file and effectively kill the user's session.

    // -- Delete sessions json file for cookie given.
    fs.unlink(sessionsFolder + req.sessions.cookie + '.json', function(err) {
        if(err) throw err;

        // NOTE: marking the session cookie as undefined forces a new session cookie to be generated and assigned. 
        req.session.cookie = undefined;
    });
    // --
};

// --

// -- Function to generate a UUID (v4 standard, see: https://www.ietf.org/rfc/rfc4122.txt). Used for session cookie.
function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}
// --
