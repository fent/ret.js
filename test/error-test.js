const assert = require('assert');
const ret = require('../dist');

describe('Regexp Tokenizer Errors', () => {
  const testThrow = (regexp, message) => {
    const expectedMessage = `Invalid regular expression: /${regexp}/: ${message}`;
    assert.throws(
      () => {
        ret(regexp);
      },
      {
        message: expectedMessage,
      },
    );
  };

  describe('Bad repetiion at beginning of', () => {
    it('regexp', () => {
      testThrow('?what', 'Nothing to repeat at column 0');
    });
    it('group', () => {
      testThrow('foo(*\\w)', 'Nothing to repeat at column 4');
    });
    it('pipe', () => {
      testThrow('foo|+bar', 'Nothing to repeat at column 4');
    });
    it('with custom repetitional', () => {
      testThrow('ok({3}no)', 'Nothing to repeat at column 3');
    });
  });

  describe('Bad grouping', () => {
    it('unmatched', () => {
      testThrow('hey(yoo))', 'Unmatched ) at column 8');
    });
    it('unclosed', () => {
      testThrow('(', 'Unterminated group');
    });
  });

  it('Wrong group type', () => {
    testThrow(
      'abcde(?>hellow)',
      "Invalid group, character '>' after '?' at column 7",
    );
  });

  it('Empty group name', () => {
    testThrow(
      '(?<>\\d{4})',
      "Invalid capture group name, character '>' after '<' at column 4",
    );
  });

  it('Bad group name', () => {
    testThrow(
      '(?<1year>\\d{4})',
      "Invalid capture group name, character '1' after '<' at column 4",
    );
  });

  it('Unclosed group name', () => {
    testThrow(
      '(?<foo\\d{4})',
      "Unclosed capture group name, expected '>', found '\\' at column 7",
    );
  });

  it('Unclosed group terminal', () => {
    testThrow(
      '(?<foo',
      "Unclosed capture group name, expected '>', found 'undefined' at column 7",
    );
  });

  it('Bad custom character set', () => {
    testThrow('[abc', 'Unterminated character class');
  });

  describe('End of pattern', () => {
    it('Backslash', () => {
      testThrow('abc\\', '\\ at end of pattern');
    });
    it('Groups', () => {
      testThrow(
        '(?',
        "Invalid group, character 'undefined' after '?' at column 2",
      );
    });
    it('Groups2', () => {
      testThrow('(?=', 'Unterminated group');
    });
  });
});
