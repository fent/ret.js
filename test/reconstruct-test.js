const vows = require('vows');
const assert = require('assert');
const ret = require('../dist');
const reconstruct = require('../dist/reconstruct').reconstruct;
const types = require('../dist/types').types;

const similarToWhitespaceSet = [
  { type: types.CHAR, value: 9 },
  { type: types.CHAR, value: 10 },
  { type: types.CHAR, value: 11 },
  { type: types.CHAR, value: 12 },
  { type: types.CHAR, value: 13 },
  { type: types.CHAR, value: 32 },
  { type: types.CHAR, value: 160 },
  { type: types.CHAR, value: 5760 },
  { type: types.RANGE, from: 8192, to: 8200 },
  { type: types.CHAR, value: 8232 },
  { type: types.CHAR, value: 8233 },
  { type: types.CHAR, value: 8239 },
  { type: types.CHAR, value: 8287 },
  { type: types.CHAR, value: 12288 },
  { type: types.CHAR, value: 65279 },
].map(code => code.type === types.CHAR ?
  String.fromCharCode(code.value) :
  `${String.fromCharCode(code.from)}-${String.fromCharCode(code.to)}`).join('');

const inverseTestFactory = (regexp, expected) => ({
  topic: ret(regexp),

  [`Checking ${regexp} reconstructs`]: t => {
    // Make sure there are no invalid test cases
    if ('stack' in t) {
      for (const elem of t.stack) {
        const badRange = elem.type === types.SET &&
        elem.set.some(token => token.type === types.RANGE && token.to < token.from);

        assert.deepStrictEqual(badRange, false);
      }
    }

    // May need to do some sort of sanitisation here
    const reconstructed = reconstruct(t);
    assert.isString(reconstructed);
    if (expected) {
      assert.deepStrictEqual(reconstructed, expected);
    } else {
      assert.deepStrictEqual(reconstructed, regexp.replace(/\[\^0-9\]/g, '\\D')
        .replace(/\[0-9\]/g, '\\d')
        .replace(/\[\^_a-zA-Z0-9\]/g, '\\W')
        .replace(/\[_a-zA-Z0-9\]/g, '\\w'),
      );
    }
  },
});

/* ! fromentries. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
function fromEntries(iterable) {
  return [...iterable].reduce((obj, [key, val]) => {
    obj[key] = val;
    return obj;
  }, {});
}

const multiInverseTestFactory = regexps => fromEntries(
  regexps.map(regexp => [regexp, inverseTestFactory(regexp)]),
);

vows.describe('Regexp Reconstruction')
  .addBatch({
    'basic (using inverse of Ret)': multiInverseTestFactory([
      '',
      'a',
      '1',
      '.',
      ',',
      'word',
      '//',
      '\\W',
      '\\D',
      '\\w\\W\\d\\D\\s\\S.',
    ]),
    'testing start and finish flags (using inverse of Ret)': multiInverseTestFactory([
      '$',
      '^',
      '$a^',
      '.^',
      '$,',
      '$word^',
      '$//^',
      '$\\W^',
      '$\\D^',
      '$\\w\\W\\d\\D\\s\\S.^',
    ]),
    'testing handleing of escaped special characters': multiInverseTestFactory([
      '\\$',
      '\\^',
      '\\[',
      '^\\^',
      '\\.',
      '\\|',
      '\\?',
      '\\(',
      '\\)',
      '\\{',
      '\\}',
      '\\\\',
      '\\$\\^\\[]\\.|',
      '$\\^\\[]\\.\\|',
      '\\$^\\[]\\.\\|',
      '\\$\\^\\[]\\.\\|',
      '\\$\\^[]\\.\\|',
      '\\$\\^[]\\.\\|',
      '\\$\\^\\[].\\|',
      '\\$\\^\\[]\\.|',
      '\\$\\^\\[]\\.|\\\\',
      '\\$\\^\\[]\\.\\\\|',
      '\\\\\\$\\^\\[]\\.|',
    ]),
    'all main regexp expressions': {
      'No special characters': inverseTestFactory('walnuts'),
      '^ and $ in': inverseTestFactory('^yes$'),
      '\\b and \\B': inverseTestFactory('\\bbeginning\\B'),
      'Predefined sets': inverseTestFactory('\\w\\W\\d\\D\\s\\S.'),
      'Custom Sets': multiInverseTestFactory([
        '[$!a-z123] thing [^0-9]',
        '[^.]',
        '[^test]',
      ]),
      'Whitespace characters': inverseTestFactory('[\t\r\n\u2028\u2029 ]'),
      'Two sets in a row with dash in between': inverseTestFactory('[01]-[ab]'),
      '| (Pipe)': multiInverseTestFactory([
        'foo|bar|za',
        '(foo|bar|za)',
        '(foo|bar|za)|(^fe|fi|fo|fum)',
      ]),
      Group: {
        'with no special characters': inverseTestFactory('hey (there)'),
        'that is not remembered': inverseTestFactory('(?:loner)'),
        'matched previous clause if not followed by this': inverseTestFactory('what(?!ever)'),
        'matched next clause': inverseTestFactory('hello(?= there)'),
        'with subgroup': inverseTestFactory('a(b(c|(?:d))fg) @_@'),
      },
      'Custom repetition with': {
        'exact amount': inverseTestFactory('(?:pika){2}'),
        'minimum amount only': inverseTestFactory('NO{6,}'),
        'both minimum and maximum': inverseTestFactory('pika\\.\\.\\. chu{3,20}!{1,2}'),
        'Brackets around a non-repetitional': inverseTestFactory('a{mustache}', 'a\\{mustache\\}'),
        'Predefined repetitional': {
          '? (Optional)': inverseTestFactory('hey(?: you)?'),
          '+ (At least one)': inverseTestFactory('(no )+'),
          '* (Any amount)': inverseTestFactory('XF*D'),
        },
        // 'Lookarounds': multiInverseTestFactory([
        //   '(?<=a)b',
        //   '(?<=text)',
        //   '(?<!a)b',
        //   '(?<!text)',
        //   '(?<!ab{2,4}c{3,5}d)test'
        // ]),
        'Unicode Characters': multiInverseTestFactory([
          //  '[A\\xA9\\u2603]|\\uD834\\uDF06',
          //  '[\\0-@\\{-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|
          //   [\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]'
        ]),
        Reference: inverseTestFactory('<(\\w+)>\\w*<\\1>'),
        Simplifications: multiInverseTestFactory([
          '[_a-zA-Z0-9]',
          '[0-9]',
          '[^_a-zA-Z0-9]',
          '[^0-9]',
        ]),
        // Testing for https://github.com/fent/ret.js/pull/25#discussion_r533492862
        'Range (in set) test cases': {
          'Testing complex range cases': {
            'token.from is a hyphen and the range is preceded by a single character [a\\---]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.CHAR, value: 97 },
                  { type: types.RANGE, from: 45, to: 45 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[a\\---]');
              },
            },
            'token.from is a hyphen and the range is preceded by a single character [a\\--/]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.CHAR, value: 97 },
                  { type: types.RANGE, from: 45, to: 47 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[a\\--/]');
              },
            },
            'token.from is a hyphen and the range is preceded by a single character [c\\--a]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.CHAR, value: 99 },
                  { type: types.RANGE, from: 45, to: 97 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[c\\--a]');
              },
            },
            'token.from is a hyphen and the range is preceded by a single character [\\-\\---]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.CHAR, value: 45 },
                  { type: types.RANGE, from: 45, to: 45 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[\\-\\---]');
              },
            },
            'token.from is a hyphen and the range is preceded by a predefined set [\\w\\---]': {
              topic: {
                type: types.SET, not: false, set: [
                  {
                    type: types.SET, not: false, set: [
                      { type: types.CHAR, value: 95 },
                      { type: types.RANGE, from: 97, to: 122 },
                      { type: types.RANGE, from: 65, to: 90 },
                      { type: types.RANGE, from: 48, to: 57 },
                    ],
                  },
                  { type: types.RANGE, from: 45, to: 45 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[\\w\\---]');
              },
            },
            'token.from is a caret and the range is the first item of the set [9-^]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.RANGE, from: 57, to: 94 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[9-^]');
              },
            },
            'token.to is a closing square bracket [2-\\]]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.RANGE, from: 50, to: 93 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[2-\\]]');
              },
            },
            'token.from is a closing square bracket [\\]-^]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.RANGE, from: 93, to: 94 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[\\]-^]');
              },
            },
            'token.to is a closing square bracket [[-\\]]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.RANGE, from: 91, to: 93 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[[-\\]]');
              },
            },
            'token.to is a closing square bracket [[-]]': {
              topic: {
                type: types.ROOT, stack: [{
                  type: types.SET, not: false, set: [
                    { type: types.CHAR, value: 91 },
                    { type: types.CHAR, value: 45 },
                  ],
                }, {
                  type: types.CHAR, value: 93,
                }],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[[-]]');
              },
            },
            'token.from is a caret [\\^-_]': {
              topic: {
                type: types.ROOT, stack: [{
                  type: types.SET, not: false, set: [
                    { type: types.RANGE, from: 94, to: 95 },
                  ],
                }],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[\\^-_]');
              },
            },
            'token.from is a caret [\\^-^]': {
              topic: {
                type: types.ROOT, stack: [{
                  type: types.SET, not: false, set: [
                    { type: types.RANGE, from: 94, to: 94 },
                  ],
                }],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[\\^-^]');
              },
            },
            'token.from is a caret and set is negated [^^-_]': {
              topic: {
                type: types.ROOT, stack: [{
                  type: types.SET, not: true, set: [
                    { type: types.RANGE, from: 94, to: 95 },
                  ],
                }],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[^^-_]');
              },
            },
            'token.from is a caret [^^-^] and set is negated': {
              topic: {
                type: types.ROOT, stack: [{
                  type: types.SET, not: true, set: [
                    { type: types.RANGE, from: 94, to: 94 },
                  ],
                }],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[^^-^]');
              },
            },
            'Contains emtpy set': {
              topic: {
                type: types.SET, not: false, set: [],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[]');
              },
            },
            'Contains emtpy negated set': {
              topic: {
                type: types.SET, not: true, set: [],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[^]');
              },
            },
            'Contains emtpy nested set': {
              topic: {
                type: types.SET, not: false, set: [{
                  type: types.SET, not: false, set: [],
                }],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[]');
              },
            },
            'Contains emtpy nested set negated': {
              topic: {
                type: types.SET, not: true, set: [{
                  type: types.SET, not: false, set: [],
                }],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[^]');
              },
            },
            'Contains emtpy nested set and single char [a]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.SET, not: false, set: [] },
                  { type: types.CHAR, value: 97 },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[a]');
              },
            },
            'Contains emtpy nested set (on right side) and single char [a]': {
              topic: {
                type: types.SET, not: false, set: [
                  { type: types.CHAR, value: 97 },
                  { type: types.SET, not: false, set: [] },
                ],
              },
              'Reconstructs correctly': set => {
                assert.deepStrictEqual(reconstruct(set), '[a]');
              },
            },
          },
          'Testing inverse relations': multiInverseTestFactory([
            '[a\\---]',
            '[a\\--/]',
            '[c\\--a]',
            '[\\-\\---]',
            '[\\w\\---]',
            '[9-^]',
            '[09\\---]',
            '[2-\\]]',
            '[\\]-^]',
            '[\\^\\]-^]',
            '[^\\]-^]',
            '[^^-^]',
            '[[-\\]]',
            '[[-]]',
            '\\d',
            '\\D',
            '[\\\\-\\\\]',
          ]),
          'Testing inverse relations with repitions': multiInverseTestFactory([
            '[a\\---]{3}',
            '[a\\--/]{5}\\}',
            '[c\\--a]{2}',
            '[\\-\\---]\\{\\}',
            '[\\w\\---]{1}',
            '[9-^]+',
            '[09\\---]*',
            '[2-\\]]?',
            '[\\]-^]\\+',
            '[\\^\\]-^]\\*',
            '[^\\]-^]\\?',
            '[^^-^]\\{0\\}',
            '[[-\\]]{0,9}',
            '[[-]]\\{0,9\\}',
            '\\d?',
            '\\D?',
            '[\\\\-\\\\]?',
          ]),
          'Similar to predefined sets': {
            'Similar to ints': {
              topic: [{ type: types.RANGE, from: 48, to: 56 }],
              'Set similar to simplification works': set => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '[0-8]');
              },
              'Set similar to simplification works (nested)': set => {
                assert.deepStrictEqual(reconstruct({
                  type: types.SET,
                  set: [{ type: types.SET, set, not: false }],
                  not: false,
                }),
                '[0-8]');
              },
              'Negative set similar to simplification works': set => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '[^0-8]');
              },
            },
            'Similar to words': {
              WORDS: {
                topic: [
                  { type: types.CHAR, value: 95 },
                  { type: types.RANGE, from: 97, to: 122 },
                  { type: types.RANGE, from: 48, to: 57 },
                ],
                'Set simplification works': set => {
                  assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '[_a-z0-9]');
                },
                'Negative set simplification works': set => {
                  assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '[^_a-z0-9]');
                },
              },
            },
            'Similar to words with nesed set': {
              WORDS: {
                topic: [
                  { type: types.CHAR, value: 95 },
                  { type: types.RANGE, from: 97, to: 122 },
                  { type: types.SET, not: false, set: [] },
                  { type: types.RANGE, from: 48, to: 57 },
                ],
                'Set simplification works': set => {
                  assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '[_a-z0-9]');
                },
                'Negative set simplification works': set => {
                  assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '[^_a-z0-9]');
                },
              },
            },
            'Similar to whitespace': {
              topic: [
                { type: types.CHAR, value: 9 },
                { type: types.CHAR, value: 10 },
                { type: types.CHAR, value: 11 },
                { type: types.CHAR, value: 12 },
                { type: types.CHAR, value: 13 },
                { type: types.CHAR, value: 32 },
                { type: types.CHAR, value: 160 },
                { type: types.CHAR, value: 5760 },
                { type: types.RANGE, from: 8192, to: 8200 },
                { type: types.CHAR, value: 8232 },
                { type: types.CHAR, value: 8233 },
                { type: types.CHAR, value: 8239 },
                { type: types.CHAR, value: 8287 },
                { type: types.CHAR, value: 12288 },
                { type: types.CHAR, value: 65279 },
              ],
              'Set simplification works': set => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }),
                  `[${similarToWhitespaceSet}]`);
              },
              'Negative set simplification works': set => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }),
                  `[^${similarToWhitespaceSet}]`);
              },
            },
          },
        },
        'Set simplification tests': {
          INTS: {
            topic: [{ type: types.RANGE, from: 48, to: 57 }],
            'Set simplification works': set => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '\\d');
            },
            'Negative set simplification works': set => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '\\D');
            },
          },
          WORDS: {
            topic: [
              { type: types.CHAR, value: 95 },
              { type: types.RANGE, from: 97, to: 122 },
              { type: types.RANGE, from: 65, to: 90 },
              { type: types.RANGE, from: 48, to: 57 },
            ],
            'Set simplification works': set => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '\\w');
            },
            'Negative set simplification works': set => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '\\W');
            },
          },
          WHITESPACE: {
            topic: [
              { type: types.CHAR, value: 9 },
              { type: types.CHAR, value: 10 },
              { type: types.CHAR, value: 11 },
              { type: types.CHAR, value: 12 },
              { type: types.CHAR, value: 13 },
              { type: types.CHAR, value: 32 },
              { type: types.CHAR, value: 160 },
              { type: types.CHAR, value: 5760 },
              { type: types.RANGE, from: 8192, to: 8202 },
              { type: types.CHAR, value: 8232 },
              { type: types.CHAR, value: 8233 },
              { type: types.CHAR, value: 8239 },
              { type: types.CHAR, value: 8287 },
              { type: types.CHAR, value: 12288 },
              { type: types.CHAR, value: 65279 },
            ],
            'Set simplification works': set => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '\\s');
            },
            'Negative set simplification works': set => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '\\S');
            },
          },
          NOTANYCHAR: {
            topic: [
              { type: types.CHAR, value: 10 },
              { type: types.CHAR, value: 13 },
              { type: types.CHAR, value: 8232 },
              { type: types.CHAR, value: 8233 },
            ],
            'Set simplification works': set => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '.');
            },
          },
        },
      },
      'Reconstruct error test (bad root)': {
        topic: () => {
          try {
            return reconstruct({ type: ret.types.ROOT });
          } catch (e) {
            return e;
          }
        },
        'throws error emessage': err => {
          assert.isObject(err);
          assert.include(err.message, 'options or stack must be Root or Group token');
        },
      },
      'Reconstruct error test (invalid token)': {
        topic: () => {
          try {
            return reconstruct({});
          } catch (e) {
            return e;
          }
        },
        'throws error emessage': err => {
          assert.isObject(err);
          assert.include(err.message, 'Invalid token type');
        },
      },
      'Reconsutructs individual range tokens outisde of set 0-8': {
        topic: reconstruct({ type: types.RANGE, from: 48, to: 56 }),
        'Outputs range correctly': res => {
          assert.deepStrictEqual(res, '0-8');
        },
      },
      'Reconsutructs individual range tokens outisde of set 0-\\]': {
        topic: reconstruct({ type: types.RANGE, from: 48, to: 93 }),
        'Outputs range correctly': res => {
          assert.deepStrictEqual(res, '0-\\]');
        },
      },
    },
  })
  .export(module);
