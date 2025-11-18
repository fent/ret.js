const assert = require('assert');
const util = require('../dist/util');
const types = require('../dist').types;
const sets = require('../dist/sets');

describe('strToChars', () => {
  it('Convert escaped chars in str to their unescaped versions', () => {
    const str = util.strToChars(
      '\\v \\xFF hellow \\u00A3 \\50 \\u0028 there \\cB \\n \\w [\\b]',
    );
    assert.equal(str, '\v \xFF hellow \u00A3 \\50 \\( there  \n \\w \u0008');
  });

  it('Escaped chars in regex source remain espaced', () => {
    const str = util.strToChars(
      /\\xFF hellow \\u00A3 \\50 \\u0028 there \\cB \\n \\w/.source,
    );
    assert.equal(
      str,
      '\\\\xFF hellow \\\\u00A3 \\\\50 \\\\u0028 there \\\\cB \\\\n \\\\w',
    );
  });
});

describe('tokenizeClass', () => {
  describe('Class tokens', () => {
    const [tokens, pos] = util.tokenizeClass(
      '\\w\\d$\\s\\]\\B\\W\\D\\S.+-] will ignore',
    );

    it('Get a words set token', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[0], sets.words());
    });

    it('Get an integers set token', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[1], sets.ints());
    });

    it('Get some char tokens', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[2], { type: types.CHAR, value: 36 });
      assert.deepEqual(tokens[4], { type: types.CHAR, value: 93 });
      assert.deepEqual(tokens[5], { type: types.CHAR, value: 66 });
    });

    it('Get a whitespace set token', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[3], sets.whitespace());
    });

    it('Get negated sets', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[6], sets.notWords());
      assert.deepEqual(tokens[7], sets.notInts());
      assert.deepEqual(tokens[8], sets.notWhitespace());
    });

    it('Get correct char tokens at end of set', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[9], { type: types.CHAR, value: 46 });
      assert.deepEqual(tokens[10], { type: types.CHAR, value: 43 });
      assert.deepEqual(tokens[11], { type: types.CHAR, value: 45 });
    });

    it('Get correct position of closing brace', () => {
      assert.ok(typeof pos === 'number');
      assert.equal(pos, 21);
    });
  });

  describe('Ranges', () => {
    const [tokens] = util.tokenizeClass('a-z0-9]');

    it('Get alphabetic range', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[0], {
        type: types.RANGE,
        from: 97,
        to: 122,
      });
    });

    it('Get numeric range', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[1], {
        type: types.RANGE,
        from: 48,
        to: 57,
      });
    });
  });

  describe('Ranges with escaped characters', () => {
    const [tokens] = util.tokenizeClass('\\\\-~]');

    it('Get escaped backslash range', () => {
      assert.ok(Array.isArray(tokens));
      assert.deepEqual(tokens[0], {
        type: types.RANGE,
        from: 92,
        to: 126,
      });
    });
  });
});
