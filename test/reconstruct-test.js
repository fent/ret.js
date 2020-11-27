const vows = require('vows');
const assert = require('assert');
const ret = require('../dist');
const { tokenToString } = require('typescript');
const reconstruct = require('../dist/reconstruct').reconstruct
const partialConstruct = require('../dist/reconstruct').partialConstruct
const types = require('../dist/types').types

const inverseTestFactory = (regexp) => {
  return {
    topic: ret(regexp),

    [`Checking ${regexp} reconstructs`]: (t) => {
      const reconstructed = reconstruct(t) // May need to do some sort of sanitisation here
      assert.isString(reconstructed);
      assert.deepStrictEqual(reconstructed, regexp.replace(/\[\^0\-9\]/g, '\\D')
                                                  .replace(/\[0\-9\]/g, '\\d')
                                                  .replace(/\[\^\_a\-zA\-Z0\-9\]/g, '\\W')
                                                  .replace(/\[\_a\-zA\-Z0\-9\]/g, '\\w')
      )
    },

    [`Checking ${regexp} reconstructs using partialConstruct`]: (t) => {
      const reconstructed = partialConstruct(t)
      assert.isString(reconstructed);
      assert.deepStrictEqual(reconstructed, regexp.replace(/\[\^0\-9\]/g, '\\D')
                                                  .replace(/\[0\-9\]/g, '\\d')
                                                  .replace(/\[\^\_a\-zA\-Z0\-9\]/g, '\\W')
                                                  .replace(/\[\_a\-zA\-Z0\-9\]/g, '\\w')
      )
    }
  }
}

/*! fromentries. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
function fromEntries(iterable) {
  return [...iterable].reduce((obj, [key, val]) => {
    obj[key] = val
    return obj
  }, {})
}

const multiInverseTestFactory = regexps => fromEntries(
  regexps.map(regexp => [regexp, inverseTestFactory(regexp)])
)

vows.describe('Regexp Reconstruction')
  .addBatch({
    'basic (using inverse of Ret)': multiInverseTestFactory([
      '',
      'a',
      '1',
      '.',
      ',',
      'word',
      '\\/\\/',
      '\\W',
      '\\D',
      '\\w\\W\\d\\D\\s\\S.'
    ]),
    'testing start and finish flags (using inverse of Ret)': multiInverseTestFactory([
      '$',
      '^',
      '$a^',
      '.^',
      '$,',
      '$word^',
      '$\\/\\/^',
      '$\\W^',
      '$\\D^',
      '$\\w\\W\\d\\D\\s\\S.^'
    ]),
    'all main regexp expressions': {
      'No special characters': inverseTestFactory('walnuts'),
      '^ and $ in': inverseTestFactory('^yes$'),
      '\\b and \\B': inverseTestFactory('\\bbeginning\\B'),
      'Predefined sets': inverseTestFactory('\\w\\W\\d\\D\\s\\S.'),
      'Custom Sets': multiInverseTestFactory([
        '[$!a-z123] thing [^0-9]',
        '[^\\.]',
        '[^test]'
      ]),
      'Whitespace characters': inverseTestFactory('[\t\r\n\u2028\u2029 ]'),
      'Two sets in a row with dash in between': inverseTestFactory('[01]-[ab]'),
      '| (Pipe)': multiInverseTestFactory([
        'foo|bar|za',
        '(foo|bar|za)',
        '(foo|bar|za)|(^fe|fi|fo|fum)',
      ]),
      'Group': {
        'with no special characters': inverseTestFactory('hey (there)'),
        'that is not remembered': inverseTestFactory('(?:loner)'),
        'matched previous clause if not followed by this': inverseTestFactory('what(?!ever)'),
        'matched next clause': inverseTestFactory('hello(?= there)'),
        'with subgroup': inverseTestFactory('a(b(c|(?:d))fg) @_@')
      },
      'Custom repetition with': {
        'exact amount': inverseTestFactory('(?:pika){2}'),
        'minimum amount only': inverseTestFactory('NO{6,}'),
        'both minimum and maximum': inverseTestFactory('pika\\.\\.\\. chu{3,20}!{1,2}'),
        'Brackets around a non-repetitional': inverseTestFactory('a{mustache}'),
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
          //  '[\\0-@\\{-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]'
        ]),
        'Reference': inverseTestFactory('<(\\w+)>\\w*<\\1>'),
        'Simplifications': multiInverseTestFactory([
          '[_a-zA-Z0-9]',
          '[0-9]',
          '[^_a-zA-Z0-9]',
          '[^0-9]',
          ]),
        'Set simplification tests': {
          'INTS': {
            'topic': [{ type: types.RANGE, from: 48, to: 57 }],   
            'Set simplification works': (set) => {
              assert.deepStrictEqual(partialConstruct({ type: types.SET, set, not: false }), '\\d')
            },
            'Negative set simplification works': (set) => {
              assert.deepStrictEqual(partialConstruct({ type: types.SET, set, not: true }), '\\D')
            },
          },
          'WORDS': {
            'topic': [
              { type: types.CHAR, value: 95 },
              { type: types.RANGE, from: 97, to: 122 },
              { type: types.RANGE, from: 65, to: 90 },
              { type: types.RANGE , from: 48, to: 57 }
            ],
            'Set simplification works': (set) => {
              assert.deepStrictEqual(partialConstruct({ type: types.SET, set, not: false }), '\\w')
            },
            'Negative set simplification works': (set) => {
              assert.deepStrictEqual(partialConstruct({ type: types.SET, set, not: true }), '\\W')
            },
          },
          'WHITESPACE': {
            'topic': [
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
              { type: types.CHAR, value: 65279 }
            ], 
            'Set simplification works': (set) => {
              assert.deepStrictEqual(partialConstruct({ type: types.SET, set, not: false }), '\\s')
            },
            'Negative set simplification works': (set) => {
              assert.deepStrictEqual(partialConstruct({ type: types.SET, set, not: true }), '\\S')
            },
          },
          'NOTANYCHAR': {
            'topic': [
              { type: types.CHAR, value: 10 },
              { type: types.CHAR, value: 13 },
              { type: types.CHAR, value: 8232 },
              { type: types.CHAR, value: 8233 },
            ],    
            'Set simplification works': (set) => {
              assert.deepStrictEqual(partialConstruct({ type: types.SET, set, not: true }), '.')
            },
          },
        },
      },
      'Reconstruct error test (bad root)': {
        'topic': () => {
          try {
            reconstruct({ type : ret.types.ROOT });
          } catch (e) {
            return e;
          }
        },
        'throws error emessage': (err) => {
          assert.isObject(err);
          assert.include(err.message, 'options or stack must be Root or Group token');
        },
      },
      'Reconstruct error test (invalid token)': {
        'topic': () => {
          try {
            reconstruct({});
          } catch (e) {
            return e;
          }
        },
        'throws error emessage': (err) => {
          assert.isObject(err);
          assert.include(err.message, 'Invalid token type');
        },
      },
    },
  })
  .export(module);
