import assert from 'assert';
import * as sets from '../lib/sets';
import ret, { types } from '../lib';

const char = (c: string) => ({ type: types.CHAR, value: c.charCodeAt(0) });

const charStr = (str: string) => str.split('').map(char);

describe('Regexp Tokenizer', () => {
  describe('No special characters', () => {
    it('List of char tokens', () => {
      const t = ret('walnuts');
      assert.deepEqual(t, {
        type: types.ROOT,
        stack: charStr('walnuts'),
      });
    });
  });

  describe('Positionals', () => {
    describe('^ and $ in', () => {
      describe('one liner', () => {
        it('Positionals at beginning and end', () => {
          const t = ret('^yes$');
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              { type: types.POSITION, value: '^' },
              char('y'),
              char('e'),
              char('s'),
              { type: types.POSITION, value: '$' },
            ],
          });
        });
      });
    });

    describe('\\b and \\B', () => {
      it('Word boundary at beginning', () => {
        const t = ret('\\bbeginning\\B');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            { type: types.POSITION, value: 'b' },
            char('b'),
            char('e'),
            char('g'),
            char('i'),
            char('n'),
            char('n'),
            char('i'),
            char('n'),
            char('g'),
            { type: types.POSITION, value: 'B' },
          ],
        });
      });
    });
  });

  describe('Predefined sets', () => {
    const t = ret('\\w\\W\\d\\D\\s\\S.');

    it('Words set', () => {
      assert.ok(Array.isArray(t.stack));
      assert.deepEqual(t.stack[0], sets.words());
    });

    it('Non-Words set', () => {
      assert.ok(Array.isArray(t.stack));
      assert.deepEqual(t.stack[1], sets.notWords());
    });

    it('Integer set', () => {
      assert.ok(Array.isArray(t.stack));
      assert.deepEqual(t.stack[2], sets.ints());
    });

    it('Non-Integer set', () => {
      assert.ok(Array.isArray(t.stack));
      assert.deepEqual(t.stack[3], sets.notInts());
    });

    it('Whitespace set', () => {
      assert.ok(Array.isArray(t.stack));
      assert.deepEqual(t.stack[4], sets.whitespace());
    });

    it('Non-Whitespace set', () => {
      assert.ok(Array.isArray(t.stack));
      assert.deepEqual(t.stack[5], sets.notWhitespace());
    });

    it('Any character set', () => {
      assert.ok(Array.isArray(t.stack));
      assert.deepEqual(t.stack[6], sets.anyChar());
    });
  });

  describe('Custom sets', () => {
    it('Class contains all characters and range', () => {
      const t = ret('[$!a-z123] thing [^0-9]');
      assert.deepEqual(t, {
        type: types.ROOT,
        stack: [
          {
            type: types.SET,
            set: [
              char('$'),
              char('!'),
              {
                type: types.RANGE,
                from: 'a'.charCodeAt(0),
                to: 'z'.charCodeAt(0),
              },
              char('1'),
              char('2'),
              char('3'),
            ],
            not: false,
          },

          char(' '),
          char('t'),
          char('h'),
          char('i'),
          char('n'),
          char('g'),
          char(' '),

          {
            type: types.SET,
            set: [
              {
                type: types.RANGE,
                from: '0'.charCodeAt(0),
                to: '9'.charCodeAt(0),
              },
            ],
            not: true,
          },
        ],
      });
    });
    describe('Whitespace characters', () => {
      it('Class contains some whitespace characters (not included in .)', () => {
        const t = ret('[\t\r\n\u2028\u2029 ]');
        const LINE_SEPARATOR = '\u2028';
        const PAGE_SEPARATOR = '\u2029';

        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.SET,
              set: [char('\t'), char('\r'), char('\n'), char(LINE_SEPARATOR), char(PAGE_SEPARATOR), char(' ')],
              not: false,
            },
          ],
        });
      });
    });
  });

  describe('Two sets in a row with dash in between', () => {
    it('Contains both classes and no range', () => {
      const t = ret('[01]-[ab]');
      assert.deepEqual(t, {
        type: types.ROOT,
        stack: [
          {
            type: types.SET,
            set: charStr('01'),
            not: false,
          },
          char('-'),
          {
            type: types.SET,
            set: charStr('ab'),
            not: false,
          },
        ],
      });
    });
  });

  describe('| (Pipe)', () => {
    it('Returns root object with options', () => {
      const t = ret('foo|bar|za');
      assert.deepEqual(t, {
        type: types.ROOT,
        options: [charStr('foo'), charStr('bar'), charStr('za')],
      });
    });
  });

  describe('Group', () => {
    describe('with no special characters', () => {
      it('Token list contains group token', () => {
        const t = ret('hey (there)');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            char('h'),
            char('e'),
            char('y'),
            char(' '),
            {
              type: types.GROUP,
              remember: true,
              stack: charStr('there'),
            },
          ],
        });
      });
    });

    describe('that is not remembered', () => {
      it('Remember is false on the group object', () => {
        const t = ret('(?:loner)');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.GROUP,
              remember: false,
              stack: charStr('loner'),
            },
          ],
        });
      });
    });

    describe('matched previous clause if not followed by this', () => {
      it('Returns a group', () => {
        const t = ret('what(?!ever)');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            char('w'),
            char('h'),
            char('a'),
            char('t'),
            {
              type: types.GROUP,
              remember: false,
              notFollowedBy: true,
              stack: charStr('ever'),
            },
          ],
        });
      });
    });

    describe('matched next clause if preceded by this', () => {
      it('Returns a lookbehind group', () => {
        const t = ret('(?<=\\$)\\d');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.GROUP,
              remember: false,
              followedBy: true,
              lookBehind: true,
              stack: [char('$')],
            },
            sets.ints(),
          ],
        });
      });
    });

    describe('matched next clause if not preceded by this', () => {
      it('Returns a lookbehind group', () => {
        const t = ret('(?<!d)baz');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.GROUP,
              remember: false,
              notFollowedBy: true,
              lookBehind: true,
              stack: [char('d')],
            },
            ...charStr('baz'),
          ],
        });
      });
    });

    describe('lookbehind inside a lookahead, and the reverse', () => {
      it('Nests both kinds of group', () => {
        const t = ret('(?=(?<=a)b)(?<!(?=c)c)');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.GROUP,
              remember: false,
              followedBy: true,
              stack: [
                {
                  type: types.GROUP,
                  remember: false,
                  followedBy: true,
                  lookBehind: true,
                  stack: [char('a')],
                },
                char('b'),
              ],
            },
            {
              type: types.GROUP,
              remember: false,
              notFollowedBy: true,
              lookBehind: true,
              stack: [
                {
                  type: types.GROUP,
                  remember: false,
                  followedBy: true,
                  stack: [char('c')],
                },
                char('c'),
              ],
            },
          ],
        });
      });
    });

    describe('lookbehind with alternation', () => {
      it('Returns a lookbehind group with options', () => {
        const t = ret('(?<!a|bc)');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.GROUP,
              remember: false,
              notFollowedBy: true,
              lookBehind: true,
              options: [[char('a')], charStr('bc')],
            },
          ],
        });
      });
    });

    describe('empty lookbehind', () => {
      it('Returns a lookbehind group with an empty stack', () => {
        const t = ret('(?<=)a');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.GROUP,
              remember: false,
              followedBy: true,
              lookBehind: true,
              stack: [],
            },
            char('a'),
          ],
        });
      });
    });

    describe('matched next clause', () => {
      it('Returns a group', () => {
        const t = ret('hello(?= there)');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            char('h'),
            char('e'),
            char('l'),
            char('l'),
            char('o'),
            {
              type: types.GROUP,
              remember: false,
              followedBy: true,
              stack: charStr(' there'),
            },
          ],
        });
      });
    });

    describe('with a name written with unicode escapes', () => {
      it('Decodes the name', () => {
        const t = ret('(?<\\u0061\\u0062>c)');
        assert.deepEqual(t.stack, [{ type: types.GROUP, remember: true, name: 'ab', stack: [char('c')] }]);
      });
      it('Closes the name at a unicode-escaped >, as JavaScript engines do', () => {
        const t = ret('(?<n\\u003E>a)');
        assert.deepEqual(t.stack, [{ type: types.GROUP, remember: true, name: 'n', stack: charStr('>a') }]);
      });
    });

    describe('with an escaped character in the body', () => {
      it('Decodes it as text', () => {
        const t = ret('(?=\\x3D)');
        assert.deepEqual(t.stack, [{ type: types.GROUP, remember: false, followedBy: true, stack: [char('=')] }]);
      });
    });

    describe('with subgroup', () => {
      it('Groups within groups', () => {
        const t = ret('a(b(c|(?:d))fg) @_@');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            char('a'),
            {
              type: types.GROUP,
              remember: true,
              stack: [
                char('b'),
                {
                  type: types.GROUP,
                  remember: true,
                  options: [
                    [char('c')],
                    [
                      {
                        type: types.GROUP,
                        remember: false,
                        stack: charStr('d'),
                      },
                    ],
                  ],
                },
                char('f'),
                char('g'),
              ],
            },

            char(' '),
            char('@'),
            char('_'),
            char('@'),
          ],
        });
      });
    });

    describe('with name', () => {
      it('parse as groups', () => {
        const t = ret('(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.GROUP,
              stack: [{ type: types.REPETITION, min: 4, max: 4, value: sets.ints() }],
              remember: true,
              name: 'year',
            },
            char('-'),
            {
              type: types.GROUP,
              stack: [{ type: types.REPETITION, min: 2, max: 2, value: sets.ints() }],
              remember: true,
              name: 'month',
            },
            char('-'),
            {
              type: types.GROUP,
              stack: [{ type: types.REPETITION, min: 2, max: 2, value: sets.ints() }],
              remember: true,
              name: 'day',
            },
          ],
        });
      });
    });
  });

  describe('Custom repetition with', () => {
    describe('exact amount', () => {
      it('Min and max are the same', () => {
        const t = ret('(?:pika){2}');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.REPETITION,
              min: 2,
              max: 2,
              value: {
                type: types.GROUP,
                remember: false,
                stack: charStr('pika'),
              },
            },
          ],
        });
      });
    });

    describe('minimum amount only', () => {
      it('To infinity', () => {
        const t = ret('NO{6,}');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            char('N'),
            {
              type: types.REPETITION,
              min: 6,
              max: Infinity,
              value: char('O'),
            },
          ],
        });
      });
    });

    describe('both minimum and maximum', () => {
      it('Min and max differ and min < max', () => {
        const t = ret('pika\\.\\.\\. chu{3,20}!{1,2}');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            ...charStr('pika... ch'),
            { type: types.REPETITION, min: 3, max: 20, value: char('u') },
            { type: types.REPETITION, min: 1, max: 2, value: char('!') },
          ],
        });
      });
    });

    describe('Brackets around a non-repetitional', () => {
      it('Returns a non-repetitional', () => {
        const t = ret('a{mustache}');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: charStr('a{mustache}'),
        });
      });
    });
  });

  describe('Predefined repetitional', () => {
    describe('? (Optional)', () => {
      it('Get back correct min and max', () => {
        const t = ret('hey(?: you)?');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            ...charStr('hey'),
            {
              type: types.REPETITION,
              min: 0,
              max: 1,
              value: {
                type: types.GROUP,
                remember: false,
                stack: charStr(' you'),
              },
            },
          ],
        });
      });
    });

    describe('+ (At least one)', () => {
      it('Correct min and max', () => {
        const t = ret('(no )+');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            {
              type: types.REPETITION,
              min: 1,
              max: Infinity,
              value: {
                type: types.GROUP,
                remember: true,
                stack: charStr('no '),
              },
            },
          ],
        });
      });
    });

    describe('* (Any amount)', () => {
      it('0 to Infinity', () => {
        const t = ret('XF*D');
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            char('X'),
            {
              type: types.REPETITION,
              min: 0,
              max: Infinity,
              value: char('F'),
            },
            char('D'),
          ],
        });
      });
    });
  });

  describe('Reference', () => {
    it('Reference a group', () => {
      const t = ret('<(\\w+)>\\w*<\\1>');
      assert.deepEqual(t, {
        type: types.ROOT,
        stack: [
          char('<'),
          {
            type: types.GROUP,
            remember: true,
            stack: [
              {
                type: types.REPETITION,
                min: 1,
                max: Infinity,
                value: sets.words(),
              },
            ],
          },
          char('>'),
          {
            type: types.REPETITION,
            min: 0,
            max: Infinity,
            value: sets.words(),
          },
          char('<'),
          { type: types.REFERENCE, value: 1 },
          char('>'),
        ],
      });
    });
  });

  describe('NOT Reference to a lookbehind', () => {
    it('Does not count the lookbehind as a group', () => {
      const t = ret('(?<=a)(b)\\2');
      assert.deepEqual(t, {
        type: types.ROOT,
        stack: [
          { type: types.GROUP, remember: false, followedBy: true, lookBehind: true, stack: [char('a')] },
          { type: types.GROUP, remember: true, stack: [char('b')] },
          { type: types.CHAR, value: 2 },
        ],
      });
    });
  });

  describe('Reference to a group inside a lookbehind', () => {
    it('Counts the group inside the lookbehind', () => {
      const t = ret('(?<!(a))(b)\\2');
      assert.deepEqual(t, {
        type: types.ROOT,
        stack: [
          {
            type: types.GROUP,
            remember: false,
            notFollowedBy: true,
            lookBehind: true,
            stack: [{ type: types.GROUP, remember: true, stack: [char('a')] }],
          },
          { type: types.GROUP, remember: true, stack: [char('b')] },
          { type: types.REFERENCE, value: 2 },
        ],
      });
    });
  });

  describe('NOT Reference with more than one digit', () => {
    it('Reference with more than one digit', () => {
      const t = ret('<(\\w+)>\\w*<\\10>');
      assert.deepEqual(t, {
        type: types.ROOT,
        stack: [
          char('<'),
          {
            type: types.GROUP,
            remember: true,
            stack: [
              {
                type: types.REPETITION,
                min: 1,
                max: Infinity,
                value: sets.words(),
              },
            ],
          },
          char('>'),
          {
            type: types.REPETITION,
            min: 0,
            max: Infinity,
            value: sets.words(),
          },
          char('<'),
          { type: types.CHAR, value: 8 },
          char('>'),
        ],
      });
    });
  });

  describe('Reference with more than one digit', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a)(b)(c)(d)(e)(f)(g)(h)(i)(j) - \\10');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          { type: types.GROUP, stack: [char('b')], remember: true },
          { type: types.GROUP, stack: [char('c')], remember: true },
          { type: types.GROUP, stack: [char('d')], remember: true },
          { type: types.GROUP, stack: [char('e')], remember: true },
          { type: types.GROUP, stack: [char('f')], remember: true },
          { type: types.GROUP, stack: [char('g')], remember: true },
          { type: types.GROUP, stack: [char('h')], remember: true },
          { type: types.GROUP, stack: [char('i')], remember: true },
          { type: types.GROUP, stack: [char('j')], remember: true },
          char(' '),
          char('-'),
          char(' '),
          { type: types.REFERENCE, value: 10 },
        ],
      });
    });
  });

  describe('NOT Reference with more than one digit (a)(b)(c)(d)(e)(f)(g)(h)(i) - \\10', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a)(b)(c)(d)(e)(f)(g)(h)(i) - \\10');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          { type: types.GROUP, stack: [char('b')], remember: true },
          { type: types.GROUP, stack: [char('c')], remember: true },
          { type: types.GROUP, stack: [char('d')], remember: true },
          { type: types.GROUP, stack: [char('e')], remember: true },
          { type: types.GROUP, stack: [char('f')], remember: true },
          { type: types.GROUP, stack: [char('g')], remember: true },
          { type: types.GROUP, stack: [char('h')], remember: true },
          { type: types.GROUP, stack: [char('i')], remember: true },
          char(' '),
          char('-'),
          char(' '),
          { type: types.CHAR, value: 8 },
        ],
      });
    });
  });

  describe('Reference with more than one digit and referencing group after digit', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a)(b)(c)(d)(e)(f)(g)(h)(i) - \\10 (j)');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          { type: types.GROUP, stack: [char('b')], remember: true },
          { type: types.GROUP, stack: [char('c')], remember: true },
          { type: types.GROUP, stack: [char('d')], remember: true },
          { type: types.GROUP, stack: [char('e')], remember: true },
          { type: types.GROUP, stack: [char('f')], remember: true },
          { type: types.GROUP, stack: [char('g')], remember: true },
          { type: types.GROUP, stack: [char('h')], remember: true },
          { type: types.GROUP, stack: [char('i')], remember: true },
          char(' '),
          char('-'),
          char(' '),
          { type: types.REFERENCE, value: 10 },
          char(' '),
          { type: types.GROUP, stack: [char('j')], remember: true },
        ],
      });
    });
  });

  // See https://github.com/fent/ret.js/pull/39#issuecomment-1007074351
  describe('Nested capturing groups - \\1', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a) ((b) (c)) - \\1');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          char(' '),
          {
            type: types.GROUP,
            stack: [
              { type: types.GROUP, stack: [char('b')], remember: true },
              char(' '),
              { type: types.GROUP, stack: [char('c')], remember: true },
            ],
            remember: true,
          },
          char(' '),
          char('-'),
          char(' '),
          { type: types.REFERENCE, value: 1 },
        ],
      });
    });
  });

  describe('Nested capturing groups - \\2', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a) ((b) (c)) - \\2');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          char(' '),
          {
            type: types.GROUP,
            stack: [
              { type: types.GROUP, stack: [char('b')], remember: true },
              char(' '),
              { type: types.GROUP, stack: [char('c')], remember: true },
            ],
            remember: true,
          },
          char(' '),
          char('-'),
          char(' '),
          { type: types.REFERENCE, value: 2 },
        ],
      });
    });
  });

  describe('Nested capturing groups - \\3', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a) ((b) (c)) - \\3');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          char(' '),
          {
            type: types.GROUP,
            stack: [
              { type: types.GROUP, stack: [char('b')], remember: true },
              char(' '),
              { type: types.GROUP, stack: [char('c')], remember: true },
            ],
            remember: true,
          },
          char(' '),
          char('-'),
          char(' '),
          { type: types.REFERENCE, value: 3 },
        ],
      });
    });
  });

  describe('Nested capturing groups - \\4', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a) ((b) (c)) - \\4');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          char(' '),
          {
            type: types.GROUP,
            stack: [
              { type: types.GROUP, stack: [char('b')], remember: true },
              char(' '),
              { type: types.GROUP, stack: [char('c')], remember: true },
            ],
            remember: true,
          },
          char(' '),
          char('-'),
          char(' '),
          { type: types.REFERENCE, value: 4 },
        ],
      });
    });
  });

  describe('Nested capturing groups - \\5 (character)', () => {
    it('Reference with more than one digit', () => {
      const t = ret('(a) ((b) (c)) - \\5');
      assert.deepEqual(t, {
        type: 0,
        stack: [
          { type: types.GROUP, stack: [char('a')], remember: true },
          char(' '),
          {
            type: types.GROUP,
            stack: [
              { type: types.GROUP, stack: [char('b')], remember: true },
              char(' '),
              { type: types.GROUP, stack: [char('c')], remember: true },
            ],
            remember: true,
          },
          char(' '),
          char('-'),
          char(' '),
          { type: types.CHAR, value: 5 },
        ],
      });
    });
  });

  // https://github.com/fent/ret.js/pull/39#issuecomment-1008229226
  describe('escaped octal numbers', () => {
    describe('\\10', () => {
      it('Tokenizes correctly', () => {
        const t = ret('\\10');
        assert.deepStrictEqual(t, {
          type: types.ROOT,
          stack: [{ type: types.CHAR, value: 8 }],
        });
      });
    });
    describe('\\18', () => {
      it('Tokenizes correctly', () => {
        const t = ret('\\18');
        assert.deepStrictEqual(t, {
          type: types.ROOT,
          stack: [{ type: types.CHAR, value: 1 }, char('8')],
        });
      });
    });
    describe('\\108', () => {
      it('Tokenizes correctly', () => {
        const t = ret('\\108');
        assert.deepStrictEqual(t, {
          type: types.ROOT,
          stack: [{ type: types.CHAR, value: 8 }, char('8')],
        });
      });
    });
    describe('\\107', () => {
      it('Tokenizes correctly', () => {
        const t = ret('\\107');
        assert.deepStrictEqual(t, {
          type: types.ROOT,
          stack: [{ type: types.CHAR, value: 71 }],
        });
      });
    });
    describe('\\2', () => {
      it('Tokenizes correctly', () => {
        const t = ret('\\2');
        assert.deepStrictEqual(t, {
          type: types.ROOT,
          stack: [{ type: types.CHAR, value: 2 }],
        });
      });
    });
    describe('\\9', () => {
      it('Tokenizes correctly', () => {
        const t = ret('\\9');
        assert.deepStrictEqual(t, {
          type: types.ROOT,
          stack: [char('9')],
        });
      });
    });
    describe('\\90', () => {
      it('Tokenizes correctly', () => {
        const t = ret('\\90');
        assert.deepStrictEqual(t, {
          type: types.ROOT,
          stack: [char('9'), char('0')],
        });
      });
    });
  });

  describe('Range (in set) test cases', () => {
    describe('Testing complex range cases', () => {
      describe('token.from is a hyphen and the range is preceded by a single character [a\\--\\-]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[a\\--\\-]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [
                  { type: types.CHAR, value: 97 },
                  { type: types.RANGE, from: 45, to: 45 },
                ],
              },
            ],
          });
        });
      });
      describe('token.from is a hyphen and the range is preceded by a single character [a\\--\\/]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[a\\--\\/]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [
                  { type: types.CHAR, value: 97 },
                  { type: types.RANGE, from: 45, to: 47 },
                ],
              },
            ],
          });
        });
      });
      describe('token.from is a hyphen and the range is preceded by a single character [c\\--a]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[c\\--a]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [
                  { type: types.CHAR, value: 99 },
                  { type: types.RANGE, from: 45, to: 97 },
                ],
              },
            ],
          });
        });
      });
      describe('token.from is a hyphen and the range is preceded by a single character [\\-\\--\\-]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[\\-\\--\\-]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [
                  { type: types.CHAR, value: 45 },
                  { type: types.RANGE, from: 45, to: 45 },
                ],
              },
            ],
          });
        });
      });
      describe('token.from is a hyphen and the range is preceded by a predefined set [\\w\\--\\-]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[\\w\\--\\-]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [
                  {
                    type: types.SET,
                    not: false,
                    set: [
                      { type: types.CHAR, value: 95 },
                      { type: types.RANGE, from: 97, to: 122 },
                      { type: types.RANGE, from: 65, to: 90 },
                      { type: types.RANGE, from: 48, to: 57 },
                    ],
                  },
                  { type: types.RANGE, from: 45, to: 45 },
                ],
              },
            ],
          });
        });
      });
      describe('token.from is a caret and the range is the first item of the set [9-\\^]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[9-\\^]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [{ type: types.RANGE, from: 57, to: 94 }],
              },
            ],
          });
        });
      });
      describe('token.to is a closing square bracket [2-\\]]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[2-\\]]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [{ type: types.RANGE, from: 50, to: 93 }],
              },
            ],
          });
        });
      });
      describe('token.to is a closing square bracket [\\]-\\^]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[\\]-\\^]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [{ type: types.RANGE, from: 93, to: 94 }],
              },
            ],
          });
        });
      });
      describe('token.to is a closing square bracket [[-\\]]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[[-\\]]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [{ type: types.RANGE, from: 91, to: 93 }],
              },
            ],
          });
        });
      });
      describe('token.to is a closing square bracket [[-]]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[[-]]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [
                  { type: types.CHAR, value: 91 },
                  { type: types.CHAR, value: 45 },
                ],
              },
              {
                type: types.CHAR,
                value: 93,
              },
            ],
          });
        });
      });
      describe('token.from is a caret [\\^-_]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[\\^-_]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [{ type: types.RANGE, from: 94, to: 95 }],
              },
            ],
          });
        });
      });
      describe('token.from is a caret [\\^-^]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[\\^-^]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [{ type: types.RANGE, from: 94, to: 94 }],
              },
            ],
          });
        });
      });
      describe('token.from is a caret and set is negated [^\\^-_]', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[^\\^-_]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: true,
                set: [{ type: types.RANGE, from: 94, to: 95 }],
              },
            ],
          });
        });
      });
      describe('token.from is a caret [\\^-^] and set is negated', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[^\\^-^]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: true,
                set: [{ type: types.RANGE, from: 94, to: 94 }],
              },
            ],
          });
        });
      });
      describe('Contains emtpy set', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: false,
                set: [],
              },
            ],
          });
        });
      });
      describe('Contains emtpy negated set', () => {
        it('Tokenizes correctly', () => {
          const t = ret('[^]');
          assert.deepStrictEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                not: true,
                set: [],
              },
            ],
          });
        });
      });
    });
  });
});
