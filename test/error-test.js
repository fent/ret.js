var vows   = require('vows');
var assert = require('assert');
var ret    = require('..');


/**
 * @param {String} regexp
 */
function topicMacro(regexp) {
  try {
    ret(regexp);
  } catch (err) {
    return err;
  }
}


/**
 * @param {String} regexp
 * @param {String} message
 * @return {Function(Error)}
 */
function errMacro(regexp, message) {
  message = 'Invalid regular expression: /' + regexp + '/: ' + message;
  return function(err) {
    assert.isObject(err);
    assert.include(err, 'message');
    assert.equal(err.message, message);
  };
}


/**
 * @param {String} regexp
 * @param {String} name
 * @param {String} message
 * @return {Object}
 */
function macro(regexp, name, message) {
  var obj = { topic: topicMacro(regexp) };
  obj[name] = errMacro(regexp, message);
  return obj;
}


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
