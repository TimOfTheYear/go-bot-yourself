// Our Twitter library
var Twit = require('twit');

// We need to include our configuration file
var T = new Twit(require('./config.js'));

// Include fs lib for caching to file system
var fs = require('fs');

// This will be our Markov Chain prototype
var MarkovChain = require('./markov.js');

// Last tweet we responded too, only want mentions since then.
var lastResponded;

/**
 * Restores cache info, if any exists, and begins the server loop.
 */
function startup() {
    fs.readFile('./cache/lastResponded.txt', { encoding: 'utf8' },
        function(err, data) {
            if(!err) {
                lastResponded = data;
                console.log('Cache Initialized. Last Responded: ',
                    lastResponded);
            } else {
                console.log('No Existing Cache Found: ', lastResponded);
            }

        // Check for requests immediately upon startup.
        checkForRequests();

        // Twitter allows for 15 statuses/mentions_timeline requests per 15 minutes
        // 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
        setInterval(checkForRequests, 1000 * 60);
    });
}

/**
 * Caches app data to disk so state can be restored if bot is stopped/started.
 */
function updateCache() {
    fs.writeFile('./cache/lastResponded.txt', lastResponded,
        { encoding: 'utf8' }, function (err) {
        if (err) {
            console.log('Error: ', err);
            if(err.errno == -2) {
                fs.mkdir('./cache', function(err) {
                    if(!err) updateCache();
                });
            }
        }
        else console.log('Cache updated.');
    });
}

/**
 * Fetches a user's timeline, then constructs a Markov chain from
 * their status history.
 *
 * @param username - The twitter screen_name whose history should be fetched.
 * @param onComplete - Callback function where the completed markov chain will
 *          will be returned to.
 */
function learnFromUser(username, onComplete) {
    T.get("statuses/user_timeline", { screen_name: username, count: 200,
        exclude_replies: true, include_rts: false}, function (error, data) {
            if(!error) {
                var tweets = [];

                console.log("Tweets returned: ", data.length);
                var markovChain = new MarkovChain(1);

                for(var i = 0; i < data.length; i++) {
                    markovChain.learnFromSource(data[i].text);
                }

                console.log("Learning Complete.");

                onComplete(markovChain);
            } else {
                console.log("Error: ", error);
            }
        });
}

/**
 * Learns from the user issuing the request and then tweets a response to them
 * that is a "quote" generated from the markov representation of their statuses.
 *
 * @param data - Object representing the tweet requesting an impersonation.
 */
function generateTweet(data) {
    learnFromUser(data.user.screen_name, function(chain) {
        // 140 = tweet length, -6 for spaces/characters, -screen_name.length
        var requestLength = 134 - data.user.screen_name.length;
        var tweet = '"' + chain.generateString(requestLength) +
                    '" - @' + data.user.screen_name;

        T.post("statuses/update", { status: tweet,
            in_reply_to_status_id: data.id_str },
            function(error, body, response) {
                if(!error) {
                    console.log("Tweet sent");
                } else {
                    console.log("Error: ", error);
                }
            });
    });
}

/**
 * Fetches the authenticated twitter account's mentions feed & issues a response
 * to the most recent mentioner.
 */
function checkForRequests() {
    var params = {};

    // If this is our first time running the bot, lastResponed == undefined
    if(typeof lastResponded == 'string') {
        params.since_id = lastResponded;
    }

    // Feth any mentions we've had since the last one we've responded to.
    T.get("statuses/mentions_timeline", params, function(error, data) {
        if(!error && data.length > 0) {
            // Reply to multiple people. Twitter allows up to 12/min but lets
            // stick to 10 just to be safe for now.
            var responses = data.length > 10 ? 10 : data.length;

            console.log('Generating responses: ', responses);

            for(var i = responses - 1; i >= 0; i--) {
                generateTweet(data[i]);
            }

            lastResponded = data[0].id_str;
            updateCache();
        } else if(error) {
            console.log("Error: ", error);
        } else {
            console.log("No Requests");
        }
    })
}

// Startup the bot.
startup();
