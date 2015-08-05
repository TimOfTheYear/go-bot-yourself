var MarkovChain = function () {
    this.chain = {};
}

// What should be considered the end of a sentence?
var punctuationFilter = [ ".", "!", "?" ];

MarkovChain.prototype.learnFromSource = function(source) {
    var pieces = source.split(" ");
    var lastWord = "";

    for(var i = 0; i < pieces.length; i++) {
        var punctuation = [];
        var endChar = pieces[i].charAt(pieces[i].length - 1);

        while(punctuationFilter.indexOf(endChar) >= 0) {
            punctuation.push(endChar);
            pieces[i] = pieces[i].substring(0, pieces[i].length - 1);
            endChar = pieces[i].charAt(pieces[i].length - 1);
        }

        if (typeof this.chain[lastWord] == 'undefined') {
            this.chain[lastWord] = {};
            this.chain[lastWord][pieces[i]] = 0;
        } else if (typeof this.chain[lastWord][pieces[i]] == 'undefined') {
            this.chain[lastWord][pieces[i]] = 0;
        }

        this.chain[lastWord][pieces[i]]++;
        lastWord = pieces[i];

        if (typeof this.chain[lastWord] == 'undefined') {
            this.chain[lastWord] = {};
        }

        for(var p = 0; p < punctuation.length; p++) {
            if(typeof this.chain[lastWord][punctuation[p]] == 'undefined') {
                this.chain[lastWord][punctuation[p]] = 0;
            }

            this.chain[lastWord][punctuation[p]]++;
        }
    }
}

MarkovChain.prototype.generateString = function(targetLength) {
    var string = "";
    var lastWord = "";

    while(string.length < targetLength && punctuationFilter.indexOf(string.charAt(string.length - 1)) < 0 &&
        Object.keys(this.chain[lastWord]).length > 0) {
        var potentials = [];

        // Create a potentials array with one entry per frequency occured in
        // source. There has got to be a better way to do this rather than
        // duplicating array entries, but I haven't figured it out yet. ¯\_(ツ)_/¯
        for(var key in this.chain[lastWord]) {
            for(var i = 0; i < this.chain[lastWord][key]; i++) {
                potentials.push(key);
            }
        }

        lastWord = potentials[Math.floor(Math.random() * potentials.length)];

        // If its not the beginning or end of a sentence, add a space.
        if(punctuationFilter.indexOf(lastWord) < 0 && string != "") {
            string += " ";
        }

        string += lastWord;
    }

    return string;
}

module.exports = MarkovChain;
