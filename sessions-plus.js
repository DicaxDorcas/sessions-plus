// sessions-plus-patch.js
// ======================

/*
This is now be fully non-blocking.
Directory existance is checked syncronously on the require of module - which should only be imported at the launch of the server
session can be hooked with :

    sp.start(request, response);

>> request.session will now hold the session history object that will be updated asyncronously. Returns session object if needed locally.

At end of http request, instead of calling response.end() call :

    sp.end(session, response);

which saves session and sends http response.

Also in the API :
    sp.modify(session, key, value);         Asyncronously updates the session object, evaluating value(session) if a function rather than literal is passed
    sp.end(session, response);              Ends the http response then saves the session.
    sp.save(session);                       Saves the session
    sp.kill(session);                       Destroys the session

*/

"use strict";

// -- Import dependent modules
var fs = require('fs');
// --

// -- Define where to store sessions history
var sessionsFolder = './sessions/';
// -- 

// -- Checks if folder exists in project where executed.
// NOTE : BLOCKING CODE - IS ONLY RUN AT SERVER LAUNCH ON REQUIRE
if( !fs.existsSync( sessionsFolder )) {
    fs.mkdirSync( sessionsFolder );
}
// --

// -- Define max number of aync tries before throws an error
var async_max_tries = 100;
// --

// -- Declare local functions
// 
function newCookie() {
    // -- Function to generate a UUID (v4 standard, see: https://www.ietf.org/rfc/rfc4122.txt). Used for session cookie.
    function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}
    // --
    return b();
}

function throw_err( err ){
    // -- Bug tracking for now, but for production need to handle more gracefully without taking server down!
    if (err) throw err;
    // --
}

function load_historic_data( session ){
    
    // -- Set session filename based on cookie uuid
    var cookie_file = sessionsFolder + session.cookie + '.json';
    // --

    // -- Loads pre-existing session data or creates if doesn't exist.
    fs.readFile( cookie_file, 'utf8', function( err, data ){
        if (err){
            console.log("No Historic session found. Creating new session file.");
            session.loaded = true;
            exports.save( session );
        }
        else {
            console.log("Historic session loaded : " + data );
            
            // -- Avoid reading file before fully written. [See https://github.com/felixge/node-growing-file]
            var loaded_session;
            if ( typeof data !== 'string' || data.length === 0 ){
                console.log("WARNING : Avoiding reading file that is still growing. data=" + data );
                console.log("typeof data=" + typeof data );
                console.log("data.length=" + data.length );
                setTimeout( function() {load_historic_data( session );} , 10 );                    
            }
            else {
                // -- Import loaded session data [Note: session = loaded_session would destroy the pointer to request.session]
                loaded_session = JSON.parse( data );
                Object.keys(loaded_session).forEach( function (key){
                    if ( session.data[key] && session.data[key] !== loaded_session[key] ){
                        console.log("\nWarning : Overwriting " + key + "=" + session.data[key] + " with " + key + "=" + loaded_session[key] + "\n");
                    }
                    session.data[key] = loaded_session[key];                    
                });
                session.loaded = true;
            }
            // --
        }
    });
    // --
}
//
// --


// -- Expose the API / NON-BLOCKING FROM HERE

exports.start = function ( request, response ) {

    // -- Initialise an empty request.session object
    var session = request.session = {
        uuid            : 'A v4 UUID',
        loaded          : false,
        being_modified  : false,
        data            : {}
    };
    // --

    // -- Parse all cookies from request object
    var cookies = {};
    if ( request.headers.cookie ){
        request.headers.cookie.split(';').forEach( function( cookie ) {
          var parts = cookie.split('=');
          cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
        });
    }
    console.log("Parsed browser cookies : " + JSON.stringify( cookies ) );
    // --

    // -- Attach the cookie.uuid to the session to lookup records, setting a new cookie.uuid for new sessions.
    if( cookies.uuid ){
        session.cookie = cookies.uuid;
        console.log("Existing Cookie, uuid : " + cookies.uuid );
    } 
    else {
        session.cookie = newCookie();
        response.setHeader('Set-Cookie', 'uuid= ' + session.cookie );
        console.log("No Cookie Found. Created fresh uuid : " + session.cookie );
    }
    // --

    session.loaded          = false;
    session.being_modified  = false;
    load_historic_data( session );

    return session;
};

// -- Permenently saves the cookie session (and return the filename)
exports.save = function ( session, delay ) {

    var cookie_file = sessionsFolder + session.cookie + '.json';
    var session_data= JSON.stringify( session.data );

    // -- Increase the wait delay each time
    if ( (delay = delay + 1 || 0) > async_max_tries ) {
        throw("\nReally struggling to save session.uuid=" + session.cookie + "\nsession=" + JSON.stringify( session ) + '\n' );
    }
    // --

    if ( session.loaded && session.being_modified === false){
        fs.writeFile( cookie_file, session_data, throw_err );
        console.log("Saved @ '" + cookie_file + "' session : \n" + session_data);
    }
    else {
        // Can't use process.nextTick as its an I/O event we're waiting for
        setTimeout( function(){ exports.save( session, delay );} , delay );
        if ( session.being_modified ){
            console.log("Waiting " + delay + "ms to save " + cookie_file + " as session being_modified...");            
        }
        else {
            console.log("Waiting " + delay + "ms to save " + cookie_file + " as historic session not loaded...");            
        }
        
    }
};
// --

// -- Asyncronously modify the sessions data
exports.modify = function ( session, key, value, delay ){

    session.being_modified = true;

    // -- Increase the wait delay each time
    if ( (delay = delay + 1 || 0) > async_max_tries ) {
        throw("\nReally struggling to modify session.uuid=" + session.cookie + "\nsession=" + JSON.stringify( session ) + '\n' );
    }
    // --

    if ( session.loaded ){
        if ( typeof value === 'function'){
            console.log("Setting " + key + "=" + JSON.stringify( value( session ) ) + " for uuid=" + session.cookie + " and saving..." );            
            session.data[key] = value(session);
            session.being_modified = false;
        }
        else {
            console.log("Setting " + key + "=" + JSON.stringify( value ) + " for uuid=" + session.cookie + " and saving..." );            
            session.data[key] = value;    
            session.being_modified = false;
        }
    }
    else {
        setTimeout( function(){ exports.modify( session, key, value, delay );} , delay );
        console.log("Waiting " + delay + "ms to modify <" + key + "> of cookie : " + session.cookie );            
    }
}
// --

// -- Save and send the http response
exports.end = function ( session, response ){

    // Invoking this conveniently replaces response.end() in main server / request handler code

    console.log('ENDING http response and saving session');
    response.end();
    exports.save( session );
}

// -- 

// -- Delete the session file and effectively kill the user's recorded session history
exports.kill = function ( session, delay ) {

    // -- Increase the wait delay each time
    if ( (delay = delay + 1 || 0) > async_max_tries ) {
        throw("\nReally struggling to kill session.uuid=" + session.cookie + "\nsession=" + JSON.stringify( session ) + '\n' );
    }
    // --

    var cookie_file = sessionsFolder + session.cookie + '.json';

    if ( session.loaded ) {
        // -- Delete the saved file
        fs.unlink( cookie_file , throw_err );
        console.log("Deleted " + cookie_file );            
        // --
        // -- Overwrite with new session (keeping the uuid)
        session = {
            cookie : session.cookie
        };
        // --
    }
    else {
        // -- Try again later in case currently being created
        setTimeout( function(){ exports.kill( session, delay );} , delay );
        console.log("Waiting " + delay + "ms to delete " + cookie_file + " in case currently being created...");            
        // --
    }
};
// --

// --