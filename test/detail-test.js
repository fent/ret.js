const vows   = require('vows');
const assert = require('assert');
const sets   = require('../dist/sets');
const detailed    = require('../dist/token-detail').detailTokenizer;
const regexDetailTokenizer    = require('../dist/token-detail').regexDetailTokenizer;
const regTok = require('../dist/index').d


const char = (c) => {
  return { type: types.CHAR, value: c.charCodeAt(0) };
};

const charStr = (str) => {
  return str.split('').map(char);
};

vows.describe('Regexp Detailer')
  .addBatch({
    'fixed': {
      topic: detailed('^ret$'),

      'List of char tokens': (t) => {
        assert.deepStrictEqual(t.minChar, 3);
        assert.deepStrictEqual(t.maxChar, 3);
        assert.deepStrictEqual(t.fixed, true);
      }
    },

    '^ret|tor$': {
      topic: detailed('^(ret|tor)$'),

      'List of char tokens': (t) => {
        assert.deepStrictEqual(t.minChar, 3);
        assert.deepStrictEqual(t.maxChar, 3);
        assert.deepStrictEqual(t.fixed, false);
      }
    },

    'ret|torus': {
      topic: detailed('^(ret|torus)$'),

      '2 list of char tokens': (t) => {
        assert.deepStrictEqual(t.minChar, 3);
        assert.deepStrictEqual(t.maxChar, 5);
        assert.deepStrictEqual(t.fixed, false);
      }
    },

    '^ret|toru(s{7})$': {
      topic: detailed('^(ret|torus{7})$'),

      '2 list of char token + repeat': (t) => {
        assert.deepStrictEqual(t.minChar, 3);
        assert.deepStrictEqual(t.maxChar, 11);
        assert.deepStrictEqual(t.fixed, false);
        assert.deepStrictEqual(t.stringOptions, ['ret', 'torusssssss'])
      }
    },

    '^(ret|torus){7}$': {
      topic: detailed('^(ret|torus){7}$'),

      '2 list of char token + repeat': (t) => {
        assert.deepStrictEqual(t.minChar, 21);
        assert.deepStrictEqual(t.maxChar, 35);
        assert.deepStrictEqual(t.fixed, false);
      }
    },

    '^[0-9]$': {
      topic: detailed('^[0-9]$'),

      '2 list of char token + repeat': (t) => {
        assert.deepStrictEqual(t.minChar, 1);
        assert.deepStrictEqual(t.maxChar, 1);
        assert.deepStrictEqual(t.stringOptions, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
        assert.deepStrictEqual(t.fixed, false);

      }
    },

    '^[0-0]$': {
      topic: detailed('^[0-0]$'),

      '2 list of char token + repeat': (t) => {
        assert.deepStrictEqual(t.minChar, 1);
        assert.deepStrictEqual(t.maxChar, 1);
        assert.deepStrictEqual(t.fixed, true);
        assert.deepStrictEqual(t.stringOptions, ['0']);
      }
    },

    '^[0-0a-a]$': {
      topic: detailed('^[0-0a-a]$'),

      '2 list of char token + repeat': (t) => {
        assert.deepStrictEqual(t.minChar, 1);
        assert.deepStrictEqual(t.maxChar, 1);
        assert.deepStrictEqual(t.fixed, false);
      }
    },

    '^[0-9]$': {
      topic: regexDetailTokenizer(/^[0-9]$/i),

      'Basic for full tokenizer': (t) => {
        assert.deepStrictEqual(t.minChar, 1);
        assert.deepStrictEqual(t.maxChar, 1);
        assert.deepStrictEqual(t.fixed, false);
        assert.deepStrictEqual(t.flags, ['i']);
        assert.deepStrictEqual(t.stringOptions, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
      }
    },

    '[0-9]$': {
      topic: regexDetailTokenizer(/[0-9]$/i),

      'Testing unbounded': (t) => {
        assert.deepStrictEqual(t.minChar, 1);
        assert.deepStrictEqual(t.maxChar, 1);
        assert.deepStrictEqual(t.leftEnd, false);
        assert.deepStrictEqual(t.rightEnd, true);
        assert.deepStrictEqual(t.fixed, false);
        assert.deepStrictEqual(t.flags, ['i']);
      }
    },

    '/^[0-9]{1,10}$/i': {
      topic: regexDetailTokenizer(/^[0-9]{1,10}$/i),

      'Testing bounded range': (t) => {
        assert.deepStrictEqual(t.minChar, 1);
        assert.deepStrictEqual(t.maxChar, 10);
        assert.deepStrictEqual(t.fixed, false);
        assert.deepStrictEqual(t.flags, ['i']);
      },

      'Testing left end': (t) => {
        assert.deepStrictEqual(t.leftEnd, true);
      },

      'Testing right end': (t) => {
        assert.deepStrictEqual(t.rightEnd, true);
      }

    },

    '/^[0-9]*$/i': {
      topic: regexDetailTokenizer(/^[0-9]*$/i),

      'Testing bounded star': (t) => {
        assert.deepStrictEqual(t.minChar, 0);
        assert.deepStrictEqual(t.maxChar, Infinity);
        assert.deepStrictEqual(t.fixed, false);
        assert.deepStrictEqual(t.flags, ['i']);
      },
      'Testing left end': (t) => {
        assert.deepStrictEqual(t.leftEnd, true);
      },

      'Testing right end': (t) => {
        assert.deepStrictEqual(t.rightEnd, true);
      }

    },
  })
  .export(module);
