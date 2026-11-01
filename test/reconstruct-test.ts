import assert from 'assert';
import ret, { types } from '../lib';
import { reconstruct as recon } from '../lib/reconstruct';

const reconstruct = (token: any) => recon(token);

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
]
  .map(code =>
    code.type === types.CHAR ?
      String.fromCharCode(code.value) :
      `${String.fromCharCode(code.from)}-${String.fromCharCode(code.to)}`,
  )
  .join('');

const inverseTestFactory = (regexp: string, expected?: string) => {
  it(`Checking ${regexp} reconstructs`, () => {
    const t = ret(regexp);
    // Make sure there are no invalid test cases
    if ('stack' in t) {
      for (const elem of t.stack) {
        const badRange =
          elem.type === types.SET && elem.set.some(token => token.type === types.RANGE && token.to < token.from);

        assert.deepStrictEqual(badRange, false);
      }
    }

    // May need to do some sort of sanitisation here
    const reconstructed = reconstruct(t);
    assert.ok(typeof reconstructed === 'string');
    if (expected) {
      assert.deepStrictEqual(reconstructed, expected);
    } else {
      assert.deepStrictEqual(
        reconstructed,
        regexp
          .replace(/\[\^0-9\]/g, '\\D')
          .replace(/\[0-9\]/g, '\\d')
          .replace(/\[\^_a-zA-Z0-9\]/g, '\\W')
          .replace(/\[_a-zA-Z0-9\]/g, '\\w'),
      );
    }
  });
};

const multiInverseTestFactory = (regexps: string[]) => {
  for (const regexp of regexps) {
    inverseTestFactory(regexp);
  }
};

describe('Regexp Reconstruction', () => {
  describe('basic (using inverse of Ret)', () => {
    multiInverseTestFactory(['', 'a', '1', '.', ',', 'word', '//', '\\W', '\\D', '\\w\\W\\d\\D\\s\\S.']);
  });
  describe('testing start and finish flags (using inverse of Ret)', () => {
    multiInverseTestFactory(['$', '^', '$a^', '.^', '$,', '$word^', '$//^', '\\W^', '\\D^', '\\w\\W\\d\\D\\s\\S.^']);
  });
  describe('testing handleing of escaped special characters', () => {
    multiInverseTestFactory([
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
    ]);
  });
  describe('all main regexp expressions', () => {
    describe('No special characters', () => inverseTestFactory('walnuts'));
    describe('^ and $ in', () => inverseTestFactory('^yes$'));
    describe('\\b and \\B', () => inverseTestFactory('\\bbeginning\\B'));
    describe('Predefined sets', () => inverseTestFactory('\\w\\W\\d\\D\\s\\S.'));
    describe('Custom Sets', () => {
      multiInverseTestFactory(['[$!a-z123] thing [^0-9]', '[^.]', '[^test]']);
    });
    describe('Whitespace characters', () => inverseTestFactory('[\t\r\n\u2028\u2029 ]'));
    describe('Two sets in a row with dash in between', () => inverseTestFactory('[01]-[ab]'));
    describe('| (Pipe)', () => {
      multiInverseTestFactory(['foo|bar|za', '(foo|bar|za)', '(foo|bar|za)|(^fe|fi|fo|fum)']);
    });
    describe('Group', () => {
      describe('with no special characters', () => inverseTestFactory('hey (there)'));
      describe('that is not remembered', () => inverseTestFactory('(?:loner)'));
      describe('matched previous clause if not followed by this', () => inverseTestFactory('what(?!ever)'));
      describe('matched next clause', () => inverseTestFactory('hello(?= there)'));
      describe('with subgroup', () => inverseTestFactory('a(b(c|(?:d))fg) @_@'));
      describe('with name', () => inverseTestFactory('(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})'));
    });
    describe('Custom repetition with', () => {
      describe('exact amount', () => inverseTestFactory('(?:pika){2}'));
      describe('minimum amount only', () => inverseTestFactory('NO{6,}'));
      describe('both minimum and maximum', () => inverseTestFactory('pika\\.\\.\\. chu{3,20}!{1,2}'));
      describe('Brackets around a non-repetitional', () => inverseTestFactory('a{mustache}', 'a\\{mustache\\}'));
      describe('Predefined repetitional', () => {
        describe('? (Optional)', () => inverseTestFactory('hey(?: you)?'));
        describe('+ (At least one)', () => inverseTestFactory('(no )+'));
        describe('* (Any amount)', () => inverseTestFactory('XF*D'));
      });
      describe('Lookarounds', () => {
        multiInverseTestFactory([
          '(?<=a)b',
          '(?<=text)',
          '(?<!a)b',
          '(?<!text)',
          '(?<!ab{2,4}c{3,5}d)test',
          '(?<=a|b)c',
          '(?<=a)(b)\\1',
          '(?<=(a))\\1',
          '(?<=a{2,3})b',
          '(?i:(?<=a)b)',
          '(?<=(?i:a))b',
          '(?=(?<=a)b)(?<!(?=c)c)',
          '(?<=)a(?<!)',
          '(?<=a)(?<year>\\d{4})',
        ]);
      });
      describe('Unicode Characters', () => {
        multiInverseTestFactory([
          //  '[A\\xA9\\u2603]|\\uD834\\uDF06',
          //  '[\\0-@\\{-\\uD7FF\\uE000-\\uFFFF]|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|
          //   [\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF]'
        ]);
      });
      describe('Reference', () => inverseTestFactory('<(\\w+)>\\w*<\\1>'));
      describe('Simplifications', () => {
        multiInverseTestFactory(['[_a-zA-Z0-9]', '[0-9]', '[^_a-zA-Z0-9]', '[^0-9]']);
      });
      // Testing for https://github.com/fent/ret.js/pull/25#discussion_r533492862
      describe('Range (in set) test cases', () => {
        describe('Testing complex range cases', () => {
          it('token.from is a hyphen and the range is preceded by a single character [a\\---]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [
                { type: types.CHAR, value: 97 },
                { type: types.RANGE, from: 45, to: 45 },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[a\\--\\-]');
          });
          it('token.from is a hyphen and the range is preceded by a single character [a\\--/]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [
                { type: types.CHAR, value: 97 },
                { type: types.RANGE, from: 45, to: 47 },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[a\\--/]');
          });
          it('token.from is a hyphen and the range is preceded by a single character [c\\--a]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [
                { type: types.CHAR, value: 99 },
                { type: types.RANGE, from: 45, to: 97 },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[c\\--a]');
          });
          it('token.from is a hyphen and the range is preceded by a single character [\\-\\---]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [
                { type: types.CHAR, value: 45 },
                { type: types.RANGE, from: 45, to: 45 },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[\\-\\--\\-]');
          });
          it('token.from is a hyphen and the range is preceded by a predefined set [\\w\\---]', () => {
            const set = {
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
            };
            assert.deepStrictEqual(reconstruct(set), '[\\w\\--\\-]');
          });
          it('token.from is a caret and the range is the first item of the set [9-^]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [{ type: types.RANGE, from: 57, to: 94 }],
            };
            assert.deepStrictEqual(reconstruct(set), '[9-\\^]');
          });
          it('token.to is a closing square bracket [2-\\]]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [{ type: types.RANGE, from: 50, to: 93 }],
            };
            assert.deepStrictEqual(reconstruct(set), '[2-\\]]');
          });
          it('token.from is a closing square bracket [\\]-^]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [{ type: types.RANGE, from: 93, to: 94 }],
            };
            assert.deepStrictEqual(reconstruct(set), '[\\]-\\^]');
          });
          it('token.to is a closing square bracket [[-\\]]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [{ type: types.RANGE, from: 91, to: 93 }],
            };
            assert.deepStrictEqual(reconstruct(set), '[[-\\]]');
          });
          it('token.to is a closing square bracket [[-]]', () => {
            const set = {
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
            };
            assert.deepStrictEqual(reconstruct(set), '[[\\-]]');
          });
          it('token.from is a caret [\\^-_]', () => {
            const set = {
              type: types.ROOT,
              stack: [
                {
                  type: types.SET,
                  not: false,
                  set: [{ type: types.RANGE, from: 94, to: 95 }],
                },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[\\^-_]');
          });
          it('token.from is a caret [\\^-^]', () => {
            const set = {
              type: types.ROOT,
              stack: [
                {
                  type: types.SET,
                  not: false,
                  set: [{ type: types.RANGE, from: 94, to: 94 }],
                },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[\\^-\\^]');
          });
          it('token.from is a caret and set is negated [^^-_]', () => {
            const set = {
              type: types.ROOT,
              stack: [
                {
                  type: types.SET,
                  not: true,
                  set: [{ type: types.RANGE, from: 94, to: 95 }],
                },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[^\\^-_]');
          });
          it('token.from is a caret [^^-^] and set is negated', () => {
            const set = {
              type: types.ROOT,
              stack: [
                {
                  type: types.SET,
                  not: true,
                  set: [{ type: types.RANGE, from: 94, to: 94 }],
                },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[^\\^-\\^]');
          });
          it('Contains emtpy set', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [] as any[],
            };
            assert.deepStrictEqual(reconstruct(set), '[]');
          });
          it('Contains emtpy negated set', () => {
            const set = {
              type: types.SET,
              not: true,
              set: [] as any[],
            };
            assert.deepStrictEqual(reconstruct(set), '[^]');
          });
          it('Contains emtpy nested set', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [
                {
                  type: types.SET,
                  not: false,
                  set: [] as any[],
                },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[]');
          });
          it('Contains emtpy nested set negated', () => {
            const set = {
              type: types.SET,
              not: true,
              set: [
                {
                  type: types.SET,
                  not: false,
                  set: [] as any[],
                },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[^]');
          });
          it('Contains emtpy nested set and single char [a]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [
                { type: types.SET, not: false, set: [] as any[] },
                { type: types.CHAR, value: 97 },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[a]');
          });
          it('Contains emtpy nested set (on right side) and single char [a]', () => {
            const set = {
              type: types.SET,
              not: false,
              set: [
                { type: types.CHAR, value: 97 },
                { type: types.SET, not: false, set: [] as any[] },
              ],
            };
            assert.deepStrictEqual(reconstruct(set), '[a]');
          });
        });
        describe('Testing inverse relations', () => {
          multiInverseTestFactory([
            '[a\\--\\-]',
            '[a\\--/]',
            '[c\\--a]',
            '[\\-\\--\\-]',
            '[\\w\\--\\-]',
            '[9-\\^]',
            '[09\\--\\-]',
            '[2-\\]]',
            '[\\]-\\^]',
            '[\\^\\]-\\^]',
            '[^\\]-\\^]',
            '[^\\^-\\^]',
            '[[-\\]]',
            '[[\\-]]',
            '\\d',
            '\\D',
            '[\\\\-\\\\]',
          ]);
        });
        describe('Testing inverse relations with repitions', () => {
          multiInverseTestFactory([
            '[a\\--\\-]{3}',
            '[a\\--/]{5}\\}',
            '[c\\--a]{2}',
            '[\\-\\--\\-]\\{\\}',
            '[\\w\\--\\-]{1}',
            '[9-\\^]+',
            '[09\\--\\-]*',
            '[2-\\]]?',
            '[\\]-\\^]\\+',
            '[\\^\\]-\\^]\\*',
            '[^\\]-\\^]\\?',
            '[^\\^-\\^]\\{0\\}',
            '[[-\\]]{0,9}',
            '[[\\-]]\\{0,9\\}',
            '\\d?',
            '\\D?',
            '[\\\\-\\\\]?',
          ]);
        });
        describe('Similar to predefined sets', () => {
          describe('Similar to ints', () => {
            const set = [{ type: types.RANGE, from: 48, to: 56 }];
            it('Set similar to simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '[0-8]');
            });
            it('Set similar to simplification works (nested)', () => {
              assert.deepStrictEqual(
                reconstruct({
                  type: types.SET,
                  set: [{ type: types.SET, set, not: false }],
                  not: false,
                }),
                '[0-8]',
              );
            });
            it('Negative set similar to simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '[^0-8]');
            });
          });
          describe('Similar to words', () => {
            describe('WORDS', () => {
              const set = [
                { type: types.CHAR, value: 95 },
                { type: types.RANGE, from: 97, to: 122 },
                { type: types.RANGE, from: 48, to: 57 },
              ];
              it('Set simplification works', () => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '[_a-z0-9]');
              });
              it('Negative set simplification works', () => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '[^_a-z0-9]');
              });
            });
          });
          describe('Similar to words with nesed set', () => {
            describe('WORDS', () => {
              const set = [
                { type: types.CHAR, value: 95 },
                { type: types.RANGE, from: 97, to: 122 },
                { type: types.SET, not: false, set: [] as any[] },
                { type: types.RANGE, from: 48, to: 57 },
              ];
              it('Set simplification works', () => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '[_a-z0-9]');
              });
              it('Negative set simplification works', () => {
                assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '[^_a-z0-9]');
              });
            });
          });
          describe('Similar to whitespace', () => {
            const set = [
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
            ];
            it('Set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), `[${similarToWhitespaceSet}]`);
            });
            it('Negative set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), `[^${similarToWhitespaceSet}]`);
            });
          });
        });
        describe('Set simplification tests', () => {
          describe('INTS', () => {
            const set = [{ type: types.RANGE, from: 48, to: 57 }];
            it('Set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '\\d');
            });
            it('Negative set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '\\D');
            });
          });
          describe('WORDS', () => {
            const set = [
              { type: types.CHAR, value: 95 },
              { type: types.RANGE, from: 97, to: 122 },
              { type: types.RANGE, from: 65, to: 90 },
              { type: types.RANGE, from: 48, to: 57 },
            ];
            it('Set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '\\w');
            });
            it('Negative set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '\\W');
            });
          });
          describe('WHITESPACE', () => {
            const set = [
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
            ];
            it('Set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: false }), '\\s');
            });
            it('Negative set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '\\S');
            });
          });
          describe('NOTANYCHAR', () => {
            const set = [
              { type: types.CHAR, value: 10 },
              { type: types.CHAR, value: 13 },
              { type: types.CHAR, value: 8232 },
              { type: types.CHAR, value: 8233 },
            ];
            it('Set simplification works', () => {
              assert.deepStrictEqual(reconstruct({ type: types.SET, set, not: true }), '.');
            });
          });
        });
      });
      describe('Reconstruct error test (bad root)', () => {
        it('throws error emessage', () => {
          assert.throws(() => {
            reconstruct({ type: types.ROOT });
          }, /options or stack must be Root or Group token/);
        });
      });
      describe('Reconstruct error test (invalid token)', () => {
        it('throws error emessage', () => {
          assert.throws(() => {
            reconstruct({});
          }, /Invalid token type/);
        });
      });
      describe('Reconsutructs individual range tokens outisde of set 0-8', () => {
        it('Outputs range correctly', () => {
          const res = reconstruct({ type: types.RANGE, from: 48, to: 56 });
          assert.deepStrictEqual(res, '0-8');
        });
      });
      describe('Reconsutructs individual range tokens outisde of set 0-\\]', () => {
        it('Outputs range correctly', () => {
          const res = reconstruct({ type: types.RANGE, from: 48, to: 93 });
          assert.deepStrictEqual(res, '0-\\]');
        });
      });
    });
  });
});
