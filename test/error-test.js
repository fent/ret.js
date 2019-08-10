const vows   = require('vows');
const assert = require('assert');
const ret    = require('..');


/**
 * @param {string} regexp
 */
const topicMacro = (regexp) => {
  try {
    ret(regexp);
  } catch (err) {
    return err;
  }
};


/**
 * @param {string} regexp
 * @param {string} message
 * @return {Function(Error)}
 */
const errMacro = (regexp, message) => {
  message = 'Invalid regular expression: /' + regexp + '/: ' + message;
  return (err) => {
    assert.isObject(err);
    assert.include(err, 'message');
    assert.equal(err.message, message);
  };
};


/**
 * @param {string} regexp
 * @param {string} name
 * @param {string} message
 * @return {Object}
 */
const macro = (regexp, name, message) => {
  let obj = { topic: topicMacro(regexp) };
  obj[name] = errMacro(regexp, message);
  return obj;
};


vows.describe('Regexp Tokenizer Errors')
  .addBatch({
    'Bad repetiion at beginning of': {
      'regexp': macro('?what', 'Nothing to repeat',
        'Nothing to repeat at column 0'),

      'group': macro('foo(*\\w)', 'Nothing to repeat',
        'Nothing to repeat at column 4'),

      'pipe': macro('foo|+bar', 'Nothing to repeat',
        'Nothing to repeat at column 4'),

      'with custom repetitional': macro('ok({3}no)', 'Nothing to repeat',
        'Nothing to repeat at column 3'),
    },

    'Bad grouping': {
      'unmatched': macro('hey(yoo))', 'Unmatched )',
        'Unmatched ) at column 8'),
      'unclosed': macro('(', 'Unterminated group',
        'Unterminated group'),
    },

    'Wrong group type': macro('abcde(?>hellow)', 'Invalid character',
      'Invalid group, character \'>\' after \'?\' at column 7'),

    'Bad custom character set': macro('[abc', 'Unterminated character class',
      'Unterminated character class'),
  })
  .export(module);
