// Our Twitter library
var Twit = require('twit');

// We need to include our configuration file
var T = new Twit(require('./config.js'));

// This will be our Markov Chain object created during each learning.
var markovChain = {};

// Last tweet we responded too, only want mentions since then.
var lastResponded;

// What should be considered the end of a sentence?
var punctuationFilter = [ ".", "!", "?" ];

function learnFromUser(username, onComplete) {
    T.get("statuses/user_timeline", { screen_name: username, count: 200,
        exclude_replies: true, include_rts: false}, function (error, data) {
            if(!error) {
                var tweets = [];

                console.log("Tweets returned: ", data.length);

                for(var i = 0; i < data.length; i++) {
                    learnFromTweet(data[i].text);
                }

                console.log("Learning Complete, Markov Chain: ", markovChain);

                onComplete();
            } else {
                console.log("Error: ", error);
            }
        });
}

function learnFromTweet(tweet) {
    var pieces = tweet.split(" ");
    var lastWord = "";

    for(var i = 0; i < pieces.length; i++) {
        var punctuation = [];
        var endChar = pieces[i].charAt(pieces[i].length - 1);

        while(punctuationFilter.indexOf(endChar) >= 0) {
            punctuation.push(endChar);
            pieces[i] = pieces[i].substring(0, pieces[i].length - 1);
            endChar = pieces[i].charAt(pieces[i].length - 1);
        }

        if (typeof markovChain[lastWord] == 'undefined') {
            markovChain[lastWord] = {};
            markovChain[lastWord][pieces[i]] = 0;
        } else if (typeof markovChain[lastWord][pieces[i]] == 'undefined') {
            markovChain[lastWord][pieces[i]] = 0;
        }

        markovChain[lastWord][pieces[i]]++;
        lastWord = pieces[i];

        if (typeof markovChain[lastWord] == 'undefined') {
            markovChain[lastWord] = {};
        }

        for(var p = 0; p < punctuation.length; p++) {
            if(typeof markovChain[lastWord][punctuation[p]] == 'undefined') {
                markovChain[lastWord][punctuation[p]] = 0;
            }

            markovChain[lastWord][punctuation[p]]++;
        }
    }
}

function generateTweet() {
    var tweet = "";
    var lastWord = "";

    while(tweet.length < 120 && punctuationFilter.indexOf(tweet.charAt(tweet.length - 1)) < 0 &&
        Object.keys(markovChain[lastWord]).length > 0) {
        var potentials = [];

        // Create a potentials array with one entry per frequency in tweets. There has got to be
        // a better way to do this rather than duplicating array entries, but I haven't figured
        // it out yet. ¯\_(ツ)_/¯
        for(var key in markovChain[lastWord]) {
            for(var i = 0; i < markovChain[lastWord][key]; i++) {
                potentials.push(key);
            }
        }

        lastWord = potentials[Math.floor(Math.random() * potentials.length)];

        // If its not the beginning or end of a sentence, add a space.
        if(punctuationFilter.indexOf(lastWord) < 0 && tweet != "") {
            tweet += " ";
        }

        tweet += lastWord;
    }

    return tweet;
}

function checkForRequests() {
    var params = {};

    if(typeof lastResponded != 'undefined') {
        params.since_id = lastResponded;
    }

    T.get("statuses/mentions_timeline", params, function(error, data) {
        if(!error) {
            if(data.length > 0) {
                // TODO : Reply to multiple people, up to a maximum of 12 / minute
                learnFromUser(data[0].user.screen_name, function() {
                    T.post("statuses/update", { status:'"' + generateTweet() + '" - @' + data[0].user.screen_name,
                        in_reply_to_status_id: data[0].id_str }, function(error, body, response) {
                            if(!error) {
                                lastResponded = data[0].id_str;
                            } else {
                                console.log("Error: ", error);
                            }
                        });
                });
            } else {
                console.log("No Requests");
            }
        } else {
            console.log("Error: ", error);
        }
    })
}

// Check for requests immediately upon startup.
checkForRequests();

// Twitter allows for 15 statuses/mentions_timeline requests per 15 minutes
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
setInterval(checkForRequests, 1000 * 60);
