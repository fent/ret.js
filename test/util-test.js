var    vows = require('vows')
  ,  assert = require('assert')
  ,    util = require('../lib/util')
  ,   types = require('..').types
  , classes = require('../lib/classes')
  ;


vows.describe('strToChars')
  .addBatch({
    'Convert escaped chars in str to their unescaped versions': {
      topic: function() {
        return util.strToChars(
          '\\xFF hellow \\u00A3 \\50 there \\cB \\n \\w');
      },

      'Returned string has converted characters': function(str) {
        assert.equal(str, 
          '\xFF hellow \u00A3 \\( there  \n \\w');
      }
    }
  })
  .export(module);


vows.describe('tokenizeClass')
  .addBatch({
    'Class tokens': {
      topic: function() {
        return util.tokenizeClass('\\w\\d$\\s\\]\\B.] will ignore');
      },

      'Get a words class token': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][0], classes.words());
      },

      'Get an integers class token': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][1], classes.ints());
      },

      'Get some char tokens': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][2], { type: types.CHAR, value: 36 });
        assert.deepEqual(t[0][4], { type: types.CHAR, value: 93 });
        assert.deepEqual(t[0][5], { type: types.CHAR, value: 66 });
      },

      'Get a whitespace class token': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][3], classes.whitespace());
      },

      'Get an any character class token': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][6], classes.anyChar());
      },

      'Get correct position of closing brace': function(t) {
        assert.isNumber(t[1]);
        assert.equal(t[1], 13);
      }
    },

    'Ranges': {
      topic: function() {
        return util.tokenizeClass('a-z0-9]');
      },

      'Get alphabetic range': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][0], {
            type: types.RANGE
          , from: 97
          , to: 122
        });
      },

      'Get numeric range': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][1], {
            type: types.RANGE
          , from: 48
          , to: 57
        });
      }
    }
  })
  .export(module);
