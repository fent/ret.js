import assert from 'assert';
import ret from '../lib';

describe('Regexp Tokenizer Errors', () => {
  const testThrow = (regexp: string, message: string) => {
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
    testThrow('abcde(?>hellow)', "Invalid group, character '>' after '?' at column 7");
  });

  it('Empty group name', () => {
    testThrow('(?<>\\d{4})', "Invalid capture group name, character '>' after '<' at column 4");
  });

  it('Bad group name', () => {
    testThrow('(?<1year>\\d{4})', "Invalid capture group name, character '1' after '<' at column 4");
  });

  it('Unclosed group name', () => {
    testThrow('(?<foo\\d{4})', "Unclosed capture group name, expected '>', found '\\' at column 7");
  });

  it('Unclosed group terminal', () => {
    testThrow('(?<foo', "Unclosed capture group name, expected '>', found 'undefined' at column 7");
  });

  it('Bad custom character set', () => {
    testThrow('[abc', 'Unterminated character class');
  });

  describe('End of pattern', () => {
    it('Backslash', () => {
      testThrow('abc\\', '\\ at end of pattern');
    });
    it('Groups', () => {
      testThrow('(?', "Invalid group, character 'undefined' after '?' at column 2");
    });
    it('Groups2', () => {
      testThrow('(?=', 'Unterminated group');
    });
    it('Lookbehind groups', () => {
      testThrow('(?<=', 'Unterminated group');
      testThrow('(?<!', 'Unterminated group');
      testThrow('(?<=a', 'Unterminated group');
      testThrow('(?<=a))', 'Unmatched ) at column 6');
    });
  });

  it('Escaped lookbehind syntax', () => {
    // An escaped = or ! does not start a lookbehind; the exact message depends on how the name is reported.
    assert.throws(() => ret('(?<\\x3Da)'), /Invalid capture group name/);
    assert.throws(() => ret('(?<\\x21a)'), /Invalid capture group name/);
  });

  it('Escaped group syntax', () => {
    testThrow('(?\\x3Da)', 'Invalid group at column 2');
    testThrow('\\x61(?\\x3Da)', 'Invalid group at column 6');
    testThrow('\\x61(?\\x28a)', 'Invalid group at column 6');
    testThrow('(?\\x21a)', 'Invalid group at column 2');
    testThrow('(?\\x3Aa)', 'Invalid group at column 2');
    testThrow('(?\\x3Cn>a)', 'Invalid group at column 2');
    // \u escapes are allowed in group names, but not straight after (?.
    testThrow('(?\\u003Da)', 'Invalid group at column 2');
    testThrow('\\x61(?b)', "Invalid group, character 'b' after '?' at column 6");
  });

  it('Escaped group name syntax', () => {
    testThrow('(?<\\x61>a)', "Invalid capture group name, character '\\' after '<' at column 4");
    testThrow('(?<a\\x62>c)', "Unclosed capture group name, expected '>', found '\\' at column 5");
    testThrow('(?<n\\x3Ea)', "Unclosed capture group name, expected '>', found '\\' at column 5");
    testThrow('(?<n\\x3E>a)', "Unclosed capture group name, expected '>', found '\\' at column 5");
    testThrow('\\x61(?<1a>b)', "Invalid capture group name, character '1' after '<' at column 8");
  });
});
