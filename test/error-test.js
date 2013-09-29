var vows    = require('vows')
  , assert  = require('assert')
  , ret     = require('..')
  ;


var macro = function(regexp) {
  try {
    ret(regexp);
  } catch (err) {
    return err;
  }
};


vows.describe('Regexp Tokenizer Errors')
  .addBatch({
    'Bad repetiion at beginning of': {
      'regexp': {
        topic: macro('?what'),
        'Nothing to repeat': function(err) {
          assert.isObject(err);
          assert.include(err, 'message');
          assert.equal(err.message, 'Invalid regular expression: /?what/: Nothing to repeat at column 0');
        }
      },

      'group': {
        topic: macro('foo(*\\w)'),
        'Nothing to repeat': function(err) {
          assert.isObject(err);
          assert.include(err, 'message');
          assert.equal(err.message, 'Invalid regular expression: /foo(*\\w)/: Nothing to repeat at column 4');
        }
      }
    },

    'Bad grouping': {
      topic: macro('hey(yoo))'),
      'Unmatched )': function(err) {
        assert.isObject(err);
        assert.include(err, 'message');
        assert.equal(err.message, 'Invalid regular expression: /hey(yoo))/: Unmatched ) at column 8');
      }
    },

    'Wrong group type': {
      topic: macro('abcde(?>hellow)'),
      'Invalid character': function(err) {
        assert.isObject(err);
        assert.include(err, 'message');
        assert.equal(err.message, 'Invalid regular expression: /abcde(?>hellow)/: Invalid group, character \'>\' after \'?\' at column 7');
      }
    },

    'Bad custom character set': {
      topic: macro('[abc'),
      'Missing ]': function(err) {
        assert.isObject(err);
        assert.include(err, 'message');
        assert.equal(err.message, 'Invalid regular expression: /[abc/: Unterminated character class');
      }
    }
  })
  .export(module);
