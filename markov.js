var MarkovChain = function (numPrefixes) {
    this.chain = {};
    this.prefixLength = numPrefixes;
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

        for(var x = 0; x < punctuation.length; x++) {
            i++;
            words.splice(i, 0, punctuation[x]);
        }
    }

    return words;
}

/**
 * Breaks down the provided source string based on prefix length the
 * MarkovChain was initialized with and seeds the chain.
 *
 * @param source - String representing a piece of source material.
 */
MarkovChain.prototype.learnFromSource = function(source) {
    var pieces = processPunctuation(source.split(" "));
    var prefix = "";

    for(var i = 0; i < pieces.length - (this.prefixLength - 1); i++) {
        if (typeof this.chain[prefix] == 'undefined') {
            this.chain[prefix] = {};
        }

        if (typeof this.chain[prefix][pieces[i]] == 'undefined') {
            this.chain[prefix][pieces[i]] = 0;
        }

        this.chain[prefix][pieces[i]]++;

        var prefixStart = i - (this.prefixLength - 1);
        if(prefixStart < 0) prefixStart = 0;

        prefix = "";
        for(var p = prefixStart; p <= i; p++) {
            if(p > prefixStart && punctuationFilter.indexOf(pieces[p]) < 0) {
                prefix += " ";
            }

            prefix += pieces[p];
        }
    }
}

/**
 * Generates a string of some length less than or equal to the supplied target
 * length based on whatever is currently populating the chain structure.
 *
 * @param targetLength - Max length for the generated string.
 */
MarkovChain.prototype.generateString = function(targetLength) {
    var string = "";
    var prefix = "";

    while(string.length < targetLength &&
        punctuationFilter.indexOf(string.charAt(string.length - 1)) < 0 &&
        typeof this.chain[prefix] != 'undefined' &&
        Object.keys(this.chain[prefix]).length > 0) {
        var potentials = [];
        var suffixToAdd = "";

        // Create a potentials array with one entry per frequency occured in
        // source. There has got to be a better way to do this rather than
        // duplicating array entries, but I haven't figured it out yet.
        // ¯\_(ツ)_/¯
        for(var suffix in this.chain[prefix]) {
            for(var i = 0; i < this.chain[prefix][suffix]; i++) {
                potentials.push(suffix);
            }
        }

        // Loop through potentials until you find one that fits.
        do {
            suffixToAdd=potentials[Math.floor(Math.random()*potentials.length)];

            if(string.length >= targetLength - suffixToAdd.length -1) {
                var start = potentials.indexOf(suffixToAdd);
                var end = potentials.lastIndexOf(suffixToAdd);
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
        if(punctuationFilter.indexOf(suffixToAdd) < 0 && string != "") {
            string += " ";
        }

        // Add the word to the string.
        string += suffixToAdd;

        // Which word should the next prefix start with?
        var prefixParts = processPunctuation(string.split(" "));
        var prefixStart = prefixParts.length - this.prefixLength;

        // Grab the last (prefixLength) words
        prefixParts = prefixParts.slice(prefixStart < 0 ? 0 : prefixStart,
            prefixParts.length);

        // Assemble the new prefix.
        prefix = "";
        for(var x = 0; x < prefixParts.length; x++) {
            if(x != 0 && punctuationFilter.indexOf(prefixParts[x]) < 0) {
                prefix += " ";
            }

            prefix += prefixParts[x];
        }
    }

    return string;
}

module.exports = MarkovChain;
