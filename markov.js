var MarkovChain = function () {
    this.chain = {};
}

// What should be considered the end of a sentence?
var punctuationFilter = [ ".", "!", "?" ];

/**
 * Remove punctuation on the end of words and add it to list as its own entity.
 *
 * @param words - The list of words to process for punctuation.
 * @return      - The list of words with the punctuation separated out.
 */
function processPunctuation(words) {
    for(var i = 0; i < words.length; i++) {
        var punctuation = [];
        var endChar = words[i].charAt(words[i].length - 1);

        while(punctuationFilter.indexOf(endChar) >= 0) {
            punctuation.splice(0, 0, endChar);
            words[i] = words[i].substring(0, words[i].length - 1);
            endChar = words[i].charAt(words[i].length - 1);
        }

        for(var mark in punctuation) {
            i++;
            words.splice(i, 0, mark);
        }
    }

    return words;
}

MarkovChain.prototype.learnFromSource = function(source) {
    var pieces = processPunctuation(source.split(" "));
    var lastWord = "";

    for(var i = 0; i < pieces.length; i++) {
        if (typeof this.chain[lastWord] == 'undefined') {
            this.chain[lastWord] = {};
            this.chain[lastWord][pieces[i]] = 0;
        } else if (typeof this.chain[lastWord][pieces[i]] == 'undefined') {
            this.chain[lastWord][pieces[i]] = 0;
        }

        this.chain[lastWord][pieces[i]]++;
        lastWord = pieces[i];
    }
}

MarkovChain.prototype.generateString = function(targetLength) {
    var string = "";
    var lastWord = "";

    while(string.length < targetLength && punctuationFilter.indexOf(string.charAt(string.length - 1)) < 0 &&
        typeof this.chain[lastWord] != 'undefined' && Object.keys(this.chain[lastWord]).length > 0) {
        var potentials = [];

        // Create a potentials array with one entry per frequency occured in
        // source. There has got to be a better way to do this rather than
        // duplicating array entries, but I haven't figured it out yet.
        // ¯\_(ツ)_/¯
        for(var key in this.chain[lastWord]) {
            for(var i = 0; i < this.chain[lastWord][key]; i++) {
                potentials.push(key);
            }
        }

        // Loop through potentials until you find one that fits.
        do {
            lastWord = potentials[Math.floor(Math.random()*potentials.length)];

            if(string.length >= targetLength - lastWord.length -1) {
                var start = potentials.indexOf(lastWord);
                var end = potentials.lastIndexOf(lastWord);
                potentials = potentials.splice(start, end - start);
            } else { // It fits.
                break;
            }
        } while(potentials > 0); // Still have other suffixes to try?

        // No more words could fit. Bail.
        if(potentials.length == 0) {
            break;
        }

        // If its not the beginning or end of a sentence, add a space.
        if(punctuationFilter.indexOf(lastWord) < 0 && string != "") {
            string += " ";
        }

        // Add the word to the string.
        string += lastWord;
    }

    return string;
}

module.exports = MarkovChain;
