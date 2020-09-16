const vows   = require('vows');
const assert = require('assert');
const ret    = require('../dist');
const reconstruct = require('../dist/reconstruct').reconstruct
const partialConstruct = require('../dist/reconstruct').partialConstruct

const inverseTestFactory = (regexp) => {
  return {
    topic: ret(regexp),

    [`Checking ${regexp} reconstructs`] : (t) => {
      const reconstructed = reconstruct(t) // May need to do some sort of sanitisation here
      assert.isString(reconstructed);
      assert.deepStrictEqual(reconstructed, regexp.replace('[^0-9]', '\\D'))
    },

    [`Checking ${regexp} reconstructs using partialConstruct`] : (t) => {
      const reconstructed = partialConstruct(t) // May need to do some sort of sanitisation here
      assert.isString(reconstructed);
      assert.deepStrictEqual(reconstructed, regexp.replace('[^0-9]', '\\D'))
    }
  }
}

/*! fromentries. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
function fromEntries (iterable) {
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
    'basic (using inverse of Ret)' : multiInverseTestFactory([
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
    'testing start and finish flags (using inverse of Ret)' : multiInverseTestFactory([
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
    'all main regexp expressions' : {
      'No special characters' : inverseTestFactory('walnuts'),
      '^ and $ in' : inverseTestFactory('^yes$'),
      '\\b and \\B' : inverseTestFactory('\\bbeginning\\B'),
      'Predefined sets' : inverseTestFactory('\\w\\W\\d\\D\\s\\S.'),
      'Custom Sets' : inverseTestFactory('[$!a-z123] thing [^0-9]'),
      'Whitespace characters': inverseTestFactory('[\t\r\n\u2028\u2029 ]'),
      'Two sets in a row with dash in between' : inverseTestFactory('[01]-[ab]'),
      '| (Pipe)': inverseTestFactory('foo|bar|za'),
      'Group' : {
        'with no special characters' : inverseTestFactory('hey (there)'),
        'that is not rememered' : inverseTestFactory('(?:loner)'),
        'matched previous clause if not followed by this' : inverseTestFactory('what(?!ever)'),
        'matched next clause' : inverseTestFactory('hello(?= there)'),
        'with subgroup' : inverseTestFactory('a(b(c|(?:d))fg) @_@')
      },
      'Custom repetition with': {
        'exact amount' : inverseTestFactory('(?:pika){2}'),
        'minimum amount only': inverseTestFactory('NO{6,}'),
        'both minimum and maximum': inverseTestFactory('pika\\.\\.\\. chu{3,20}!{1,2}'),
        'Brackets around a non-repetitional': inverseTestFactory('a{mustache}'),
        'Predefined repetitional': {
          '? (Optional)' : inverseTestFactory('hey(?: you)?'),
          '+ (At least one)' : inverseTestFactory('(no )+'),
          '* (Any amount)' : inverseTestFactory('XF*D'),
        },
        'Reference' : inverseTestFactory('<(\\w+)>\\w*<\\1>'),
      }
    }
  })
  .export(module);
