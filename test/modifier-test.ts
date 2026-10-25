import assert from 'assert';
import ret, { Group, types } from '../lib';
import { reconstruct } from '../lib/reconstruct';

const groupOf = (pattern: string): Group => ret(pattern).stack[0] as Group;

describe('Group modifiers', () => {
  const states = [null, true, false];
  for (const ignoreCase of states) {
    for (const multiline of states) {
      for (const dotAll of states) {
        if (ignoreCase === null && multiline === null && dotAll === null) continue;
        const modifier = { ignoreCase, multiline, dotAll };
        const values = [ignoreCase, multiline, dotAll];
        const enabled = 'ims'.split('').filter((_flag, index) => values[index] === true).join('');
        const disabled = 'ims'.split('').filter((_flag, index) => values[index] === false).join('');
        const header = enabled + (disabled ? `-${disabled}` : '');
        const pattern = `(?${header}:a)`;
        it(`parses and reconstructs ${pattern}`, () => {
          const tokens = ret(pattern);
          assert.deepStrictEqual(tokens, {
            type: types.ROOT,
            stack: [{
              type: types.GROUP,
              remember: false,
              modifier,
              stack: [{ type: types.CHAR, value: 97 }],
            }],
          });
          assert.strictEqual(reconstruct(tokens), pattern);
        });
      }
    }
  }

  const roundTrips = [
    ['(?smi:a)', '(?ims:a)'],
    ['(?-smi:a)', '(?-ims:a)'],
    ['(?mi-s:a)', '(?im-s:a)'],
    ['(?i-:a)', '(?i:a)'],
    ['(?i:)', '(?i:)'],
    ['(?i:a|b)', '(?i:a|b)'],
    ['(?i:a(?-i:b)c)', '(?i:a(?-i:b)c)'],
    ['(?i:a)+', '(?i:a)+'],
    ['(?i:(a))\\1', '(?i:(a))\\1'],
    ['(?=i:hello)', '(?=i:hello)'],
    ['(?!i:hello)', '(?!i:hello)'],
    ['(?<name>i:hello)', '(?<name>i:hello)'],
  ];
  for (const [pattern, expected] of roundTrips) {
    it(`round-trips the tokens for ${pattern}`, () => {
      const tokens = ret(pattern);
      assert.strictEqual(reconstruct(tokens), expected);
      assert.deepStrictEqual(ret(expected), tokens);
    });
  }

  it('keeps nested modifier settings local to each group', () => {
    const outer = groupOf('(?i:a(?-i:b)c)');
    assert.deepStrictEqual(outer.modifier, { ignoreCase: true, multiline: null, dotAll: null });
    const inner = outer.stack[1] as Group;
    assert.deepStrictEqual(inner.modifier, { ignoreCase: false, multiline: null, dotAll: null });
  });

  it('does not attach modifiers to ordinary groups or assertions', () => {
    for (const pattern of ['(a)', '(?:a)', '(?=i:a)', '(?!i:a)', '(?<name>i:a)']) {
      assert.strictEqual(groupOf(pattern).modifier, undefined);
    }
  });

  it('does not count modifier groups as captures', () => {
    const tokens = ret('(?i:a)(b)\\1\\2');
    assert.deepStrictEqual(tokens.stack.slice(2), [
      { type: types.REFERENCE, value: 1 },
      { type: types.CHAR, value: 2 },
    ]);
  });

  it('does not treat inherited properties as modifier flags', () => {
    const prototype = Object.prototype as { x?: string };
    const previous = Object.getOwnPropertyDescriptor(prototype, 'x');
    Object.defineProperty(Object.prototype, 'x', { value: 'ignoreCase', configurable: true });
    try {
      assert.throws(() => ret('(?x:a)'), SyntaxError);
      assert.throws(() => ret('(?i-x:a)'), SyntaxError);
    } finally {
      if (previous) {
        Object.defineProperty(Object.prototype, 'x', previous);
      } else {
        delete prototype.x;
      }
    }
  });

  const invalidGroups = [
    '(?I:a)', '(?M:a)', '(?S:a)', '(?i-M:a)', '(?g:a)', '(?i-x:a)',
    '(?i>:a)', '(?i)', '(?i', '(?-', '(?i-', '(?im a)',
    '(?\\u0069:a)', '(?\\x69:a)', '(?i\\u0069:a)', '(?i\\x2Dm:a)', '(?i\\x3Aa)',
    '(?-\\u0069:a)', '(?i\\u003Aa)', '(?i\\m:a)',
    '(?d:a)', '(?y:a)', '(?u:a)', '(?v:a)', '(?i s:a)', '(?i\n:a)',
  ];
  for (const pattern of invalidGroups) {
    it(`rejects invalid group ${pattern}`, () => {
      assert.throws(() => ret(pattern), error =>
        error instanceof SyntaxError && error.message.startsWith(
          `Invalid regular expression: /${pattern}/: Invalid group`,
        ),
      );
    });
  }

  for (const pattern of ['(?ii:a)', '(?-mm:a)', '(?i-i:a)', '(?im-ms:a)', '(?s-s:a)']) {
    it(`rejects repeated flags in ${pattern}`, () => {
      assert.throws(() => ret(pattern), {
        name: 'SyntaxError',
        message: `Invalid regular expression: /${pattern}/: Repeated flag in flag group`,
      });
    });
  }

  const invalidFlagGroups = [
    ['(?-:a)', 'Invalid flag group'],
    ['(?i:m)(?-:a)', 'Invalid flag group'],
    ['(?i--m:a)', 'Multiple dashes in flag group'],
    ['(?i-m-s:a)', 'Multiple dashes in flag group'],
    ['(?--:a)', 'Multiple dashes in flag group'],
  ];
  for (const [pattern, message] of invalidFlagGroups) {
    it(`reports ${message} for ${pattern}`, () => {
      assert.throws(() => ret(pattern), {
        name: 'SyntaxError',
        message: `Invalid regular expression: /${pattern}/: ${message}`,
      });
    });
  }

  it('reports an unfinished modifier body as an unterminated group', () => {
    assert.throws(() => ret('(?i:a'), {
      name: 'SyntaxError',
      message: 'Invalid regular expression: /(?i:a/: Unterminated group',
    });
  });

  it('reconstructs a manually created modifier token', () => {
    assert.strictEqual(reconstruct({
      type: types.GROUP,
      remember: false,
      modifier: { ignoreCase: false, multiline: null, dotAll: true },
      stack: [{ type: types.CHAR, value: 97 }],
    }), '(?s-i:a)');
  });

  it('preserves capture numbering across nested and sibling modifier groups', () => {
    const tokens = ret('(?i:(a))(?-m:(b))\\1\\2\\3');
    assert.deepStrictEqual(tokens.stack.slice(2), [
      { type: types.REFERENCE, value: 1 },
      { type: types.REFERENCE, value: 2 },
      { type: types.CHAR, value: 3 },
    ]);
  });

  it('does not interpret modifier-like text in a character class or escaped group', () => {
    assert.strictEqual(ret('[?ims:()-]').stack[0].type, types.SET);
    const tokens = ret('\\(?i:a\\)');
    assert.ok(tokens.stack.every(token => token.type === types.CHAR || token.type === types.REPETITION));
  });

  for (const pattern of ['\\u0061(?i:b)', '\\x28(?i:b)', '[\\b](?i:b)', '\\\\u0069(?i:b)']) {
    it(`keeps header positions correct after decoding ${pattern}`, () => {
      const tokens = ret(pattern);
      const group = tokens.stack[tokens.stack.length - 1] as Group;
      assert.deepStrictEqual(group.modifier, { ignoreCase: true, multiline: null, dotAll: null });
      assert.deepStrictEqual(ret(reconstruct(tokens)), tokens);
    });
  }
});

// Older supported Node versions cannot compile modifier groups.
let supportsModifiers = false;
try {
  // ESLint's regex validator predates modifier syntax.
  // eslint-disable-next-line no-invalid-regexp
  supportsModifiers = new RegExp('(?i:a)').test('A');
} catch {
  // The structural and error tests above still run on these versions.
}

(supportsModifiers ? describe : describe.skip)('Group modifiers against the JavaScript runtime', () => {
  it('agrees on validity and error category for generated headers', () => {
    const check = (header: string, depth: number): void => {
      const pattern = `(?${header}:a)`;
      const category = (parse: () => unknown): string => {
        try {
          parse();
          return 'valid';
        } catch (error) {
          assert.ok(error instanceof SyntaxError);
          const match = /Repeated flag|Multiple dashes|Invalid flag group|Invalid group/.exec(error.message);
          assert.ok(match, error.message);
          return match[0];
        }
      };
      const actual = category(() => ret(pattern));
      assert.strictEqual(actual, category(() => new RegExp(pattern)), pattern);
      if (actual === 'valid') {
        const tokens = ret(pattern);
        const rebuilt = reconstruct(tokens);
        assert.deepStrictEqual(ret(rebuilt), tokens, pattern);
        assert.strictEqual(new RegExp(rebuilt).test('A'), new RegExp(pattern).test('A'), pattern);
      }
      if (depth > 0) {
        for (const flag of 'ims-Ix') check(header + flag, depth - 1);
      }
    };
    check('', 5);
  });

  const matchingCases: [string, string, string, boolean][] = [
    ['(?i:hello)', '', 'HELLO', true],
    ['(?-i:hello)', 'i', 'HELLO', false],
    ['(?m:^a$)', '', 'x\na\nx', true],
    ['(?-m:^a$)', 'm', 'x\na\nx', false],
    ['(?s:a.b)', '', 'a\nb', true],
    ['(?-s:a.b)', 's', 'a\nb', false],
    ['^(?i:a(?-i:b)c)$', '', 'AbC', true],
    ['^(?i:a(?-i:b)c)$', '', 'ABC', false],
    ['^(?i:a)b$', '', 'AB', false],
    ['^(?i:a)|b$', '', 'B', false],
    ['^(?i:a|b)$', '', 'B', true],
    ['^(?i:[a-z]+)$', '', 'ABC', true],
    ['^(?i:(a))\\1$', '', 'AA', true],
    ['^(?i:a)+$', '', 'AaA', true],
    ['^(?=(?i:a))a$', '', 'A', false],
    ['^(?i:a(?=B)b)$', '', 'AB', true],
    ['^(?i-:a)$', '', 'A', true],
    ['^(?i:\\u0061)$', '', 'A', true],
    ['^(?i:\\x61)$', '', 'A', true],
    ['^(?i:(?:a))$', '', 'A', true],
  ];
  for (const [pattern, flags, input, expected] of matchingCases) {
    it(`preserves matching of ${pattern} with flags '${flags}' on ${JSON.stringify(input)}`, () => {
      const native = new RegExp(pattern, flags);
      const rebuilt = new RegExp(reconstruct(ret(pattern)), flags);
      assert.strictEqual(native.test(input), expected);
      assert.strictEqual(rebuilt.test(input), expected);
      assert.deepStrictEqual(rebuilt.exec(input), native.exec(input));
    });
  }
});
