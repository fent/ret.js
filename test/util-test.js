var vows   = require('vows');
var assert = require('assert');
var util   = require('../lib/util');
var types  = require('..').types;
var sets   = require('../lib/sets');


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
    },
    'Escaped chars in regex source remain espaced': {
      topic: function() {
        return util.strToChars(
          /\\xFF hellow \\u00A3 \\50 there \\cB \\n \\w/.source);
      },

      'Returned string has escaped characters': function(str) {
        assert.equal(str,
          '\\\\xFF hellow \\\\u00A3 \\\\50 there \\\\cB \\\\n \\\\w');
      }
    },
  })
  .export(module);


vows.describe('tokenizeClass')
  .addBatch({
    'Class tokens': {
      topic: function() {
        return util.tokenizeClass('\\w\\d$\\s\\]\\B\\W\\D\\S.+-] will ignore');
      },

      'Get a words set token': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][0], sets.words());
      },

      'Get an integers set token': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][1], sets.ints());
      },

      'Get some char tokens': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][2], { type: types.CHAR, value: 36 });
        assert.deepEqual(t[0][4], { type: types.CHAR, value: 93 });
        assert.deepEqual(t[0][5], { type: types.CHAR, value: 66 });
      },

      'Get a whitespace set token': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][3], sets.whitespace());
      },

      'Get negated sets': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][6], sets.notWords());
        assert.deepEqual(t[0][7], sets.notInts());
        assert.deepEqual(t[0][8], sets.notWhitespace());
      },

      'Get correct char tokens at end of set': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][9], { type: types.CHAR, value: 46 });
        assert.deepEqual(t[0][10], { type: types.CHAR, value: 43 });
        assert.deepEqual(t[0][11], { type: types.CHAR, value: 45 });
      },

      'Get correct position of closing brace': function(t) {
        assert.isNumber(t[1]);
        assert.equal(t[1], 21);
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
    },

    'Ranges with escaped characters': {
      topic: function() {
        return util.tokenizeClass('\\\\-~]')
      },

      'Get escaped backslash range': function(t) {
        assert.isArray(t[0]);
        assert.deepEqual(t[0][0], {
            type: types.RANGE
          , from: 92
          , to: 126
        });
      }
    }
  })
  .export(module);
