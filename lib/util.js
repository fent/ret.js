var types = require('./types')
  , sets = require('./sets')
  ;


//
// All of these are private and only used by randexp
// it's assumed that they will always be called with the correct input
//

var CTRL = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^ ?'
  , SLSH = { '0': 0, 't': 9, 'n': 10, 'v': 11, 'f': 12, 'r': 13 }
  ;

var util = module.exports = {

  // finds character representations in str and convert all to
  // their respective characters
  strToChars: function(str) {
    var chars_regex = /(\[\\b\])|\\(?:u([A-F0-9]{4})|x([A-F0-9]{2})|(0?[0-7]{2})|c([@A-Z\[\\\]\^?])|([0tnvfr]))/g;
    str = str.replace(chars_regex, function(s, b, a16, b16, c8, dctrl, eslsh) {
      var code = b     ? 8 :
                 a16   ? parseInt(a16, 16) :
                 b16   ? parseInt(b16, 16) :
                 c8    ? parseInt(c8,   8) :
                 dctrl ? CTRL.indexOf(dctrl) :
                 eslsh ? SLSH[eslsh] : undefined;
      
      var c = String.fromCharCode(code);

      // escape special regex characters
      if (/[\[\]{}\^$.|?*+()]/.test(c)) {
        c = '\\' + c;
      }

      return c;
    });

    return str;
  },


  // turns class into tokens
  // reads str until it encounters a ] not preceeded by a \
  tokenizeClass: function(str, regexpStr) {
    var tokens = []
      , regexp = /\\(?:(w)|(d)|(s)|(W)|(D)|(S))|((?:(?:\\)(.)|([^\\]))-(?:\\)?([^\]]))|(\])|(?:\\)?(.)/g
      , rs, c
      ;


    while ((rs = regexp.exec(str)) != null) {
      if (rs[1]) {
        tokens.push(sets.words());

      } else if (rs[2]) {
        tokens.push(sets.ints());

      } else if (rs[3]) {
        tokens.push(sets.whitespace());

      } else if (rs[4]) {
        tokens.push(sets.notWords());

      } else if (rs[5]) {
        tokens.push(sets.notInts());

      } else if (rs[6]) {
        tokens.push(sets.notWhitespace());

      } else if (rs[7]) {
        tokens.push({
            type: types.RANGE
          , from: (rs[8] || rs[9]).charCodeAt(0)
          ,   to: rs[10].charCodeAt(0)
        });

      } else if (c = rs[12]) {
        tokens.push({
            type: types.CHAR
          , value: c.charCodeAt(0)
        });

      } else {
        return [tokens, regexp.lastIndex];
      }
    }

    util.error(regexpStr, 'Missing \']\'');
  },

  error: function(regexp, msg) {
    throw new Error('Invalid regular expression: /' + regexp + '/: ' + msg);
  }
};
