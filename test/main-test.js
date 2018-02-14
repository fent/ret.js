const vows   = require('vows');
const assert = require('assert');
const sets   = require('../lib/sets');
const ret    = require('..');
const types  = ret.types;


function char(c) {
  return { type: types.CHAR, value: c.charCodeAt(0) };
}

function charStr(str) {
  return str.split('').map(char);
}

vows.describe('Regexp Tokenizer')
  .addBatch({
    'No special characters': {
      topic: ret('walnuts'),

      'List of char tokens': (t) => {
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: charStr('walnuts'),
        });
      }
    },


    'Positionals': {
      '^ and $ in': {
        'one liner': {
          topic: ret('^yes$'),
          'Positionals at beginning and end': (t) => {
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
          }
        }
      },

      '\\b and \\B': {
        topic: ret('\\bbeginning\\B'),
        'Word boundary at beginning': (t) => {
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
        }
      }
    },


    'Predefined sets': {
      topic: ret('\\w\\W\\d\\D\\s\\S.'),

      'Words set': (t) => {
        assert.isArray(t.stack);
        assert.deepEqual(t.stack[0], sets.words());
      },

      'Non-Words set': (t) => {
        assert.isArray(t.stack);
        assert.deepEqual(t.stack[1], sets.notWords());
      },

      'Integer set': (t) => {
        assert.isArray(t.stack);
        assert.deepEqual(t.stack[2], sets.ints());
      },

      'Non-Integer set': (t) => {
        assert.isArray(t.stack);
        assert.deepEqual(t.stack[3], sets.notInts());
      },

      'Whitespace set': (t) => {
        assert.isArray(t.stack);
        assert.deepEqual(t.stack[4], sets.whitespace());
      },

      'Non-Whitespace set': (t) => {
        assert.isArray(t.stack);
        assert.deepEqual(t.stack[5], sets.notWhitespace());
      },

      'Any character set': (t) => {
        assert.isArray(t.stack);
        assert.deepEqual(t.stack[6], sets.anyChar());
      },
    },


    'Custom sets': {
      'topic': ret('[$!a-z123] thing [^0-9]'),

      'Class contains all characters and range': (t) => {
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            { type: types.SET,
              set: [
                char('$'),
                char('!'),
                { type: types.RANGE,
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

            { type: types.SET,
              set: [{
                type: types.RANGE,
                from: '0'.charCodeAt(0),
                to: '9'.charCodeAt(0),
              }],
              not: true,
            }
          ],
        });
      },
      'Whitespace characters': {
        'topic': ret('[\t\r\n\u2028\u2029 ]'),

        'Class contains some whitespace characters (not included in .)': (t) => {
          const LINE_SEPARATOR = String.fromCharCode(8232) // \u2028
          const PAGE_SEPARATOR = String.fromCharCode(8233) // \u2029

          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              {
                type: types.SET,
                set: [
                  char('\t'),
                  char('\r'),
                  char('\n'),
                  char(LINE_SEPARATOR),
                  char(PAGE_SEPARATOR),
                  char(' ')
                ],
                not: false,
              },
            ],
          });
        }
      }
    },

    'Two sets in a row with dash in between': {
      'topic': ret('[01]-[ab]'),
      'Contains both classes and no range': (t) => {
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            { type: types.SET,
              set: charStr('01'),
              not: false,
            },
            char('-'),
            { type: types.SET,
              set: charStr('ab'),
              not: false,
            }
          ],
        });
      }
    },


    '| (Pipe)': {
      topic: ret('foo|bar|za'),

      'Returns root object with options': (t) => {
        assert.deepEqual(t, {
          type: types.ROOT,
          options: [
            charStr('foo'),
            charStr('bar'),
            charStr('za'),
          ],
        });
      }
    },


    'Group': {
      'with no special characters': {
        topic: ret('hey (there)'),

        'Token list contains group token': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              char('h'),
              char('e'),
              char('y'),
              char(' '),
              { type: types.GROUP,
                remember: true,
                stack: charStr('there'),
              }
            ],
          });
        }
      },

      'that is not remembered': {
        topic: ret('(?:loner)'),

        'Remember is false on the group object': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [{
              type: types.GROUP,
              remember: false,
              stack: charStr('loner'),
            }]
          });
        }
      },

      'matched previous clause if not followed by this': {
        topic: ret('what(?!ever)'),

        'Returns a group': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              char('w'),
              char('h'),
              char('a'),
              char('t'),
              { type: types.GROUP,
                remember: false,
                notFollowedBy: true,
                stack: charStr('ever'),
              }
            ],
          });
        }
      },

      'matched next clause': {
        topic: ret('hello(?= there)'),

        'Returns a group': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              char('h'),
              char('e'),
              char('l'),
              char('l'),
              char('o'),
              { type: types.GROUP,
                remember: false,
                followedBy: true,
                stack: charStr(' there'),
              }
            ],
          });
        }
      },

      'with subgroup': {
        topic: ret('a(b(c|(?:d))fg) @_@'),

        'Groups within groups': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              char('a'),
              { type: types.GROUP,
                remember: true,
                stack: [
                  char('b'),
                  { type: types.GROUP,
                    remember: true,
                    options: [
                      [char('c')],
                      [{ type: types.GROUP,
                        remember: false,
                        stack: charStr('d') }]
                    ] },
                  char('f'),
                  char('g'),
                ] },

              char(' '),
              char('@'),
              char('_'),
              char('@'),
            ],
          });
        }
      }
    },


    'Custom repetition with': {
      'exact amount': {
        topic: ret('(?:pika){2}'),

        'Min and max are the same': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              { type: types.REPETITION, min: 2, max: 2,
                value: {
                  type: types.GROUP,
                  remember: false,
                  stack: charStr('pika')
                },
              }
            ],
          });
        }
      },

      'minimum amount only': {
        topic: ret('NO{6,}'),

        'To infinity': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              char('N'),
              { type: types.REPETITION, min: 6, max: Infinity,
                value: char('O') }
            ],
          });
        }
      },

      'both minimum and maximum': {
        topic: ret('pika\\.\\.\\. chu{3,20}!{1,2}'),

        'Min and max differ and min < max': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: charStr('pika... ch').concat([
              { type: types.REPETITION, min: 3, max: 20, value: char('u') },
              { type: types.REPETITION, min: 1, max: 2, value: char('!') },
            ]),
          });
        }
      },

      'Brackets around a non-repetitional': {
        topic: ret('a{mustache}'),

        'Returns a non-repetitional': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: charStr('a{mustache}'),
          });
        },
      }
    },


    'Predefined repetitional': {
      '? (Optional)': {
        topic: ret('hey(?: you)?'),

        'Get back correct min and max': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: charStr('hey').concat([
              { type: types.REPETITION, min: 0, max: 1,
                value: {
                  type: types.GROUP, remember: false,
                  stack: charStr(' you'),
                }
              }
            ]),
          });
        }
      },

      '+ (At least one)': {
        topic: ret('(no )+'),

        'Correct min and max': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [{
              type: types.REPETITION, min: 1, max: Infinity,
              value: {
                type: types.GROUP, remember: true,
                stack: charStr('no '),
              }
            }],
          });
        }
      },

      '* (Any amount)': {
        topic: ret('XF*D'),

        '0 to Infinity': (t) => {
          assert.deepEqual(t, {
            type: types.ROOT,
            stack: [
              char('X'),
              { type: types.REPETITION, min: 0, max: Infinity,
                value: char('F')},
              char('D'),
            ],
          });
        }
      }
    },


    'Reference': {
      topic: ret('<(\\w+)>\\w*<\\1>'),

      'Reference a group': (t) => {
        assert.deepEqual(t, {
          type: types.ROOT,
          stack: [
            char('<'),
            { type: types.GROUP, remember: true,
              stack: [{
                type: types.REPETITION, min: 1, max: Infinity,
                value: sets.words()}] },
            char('>'),
            { type: types.REPETITION, min: 0, max: Infinity,
              value: sets.words() },
            char('<'),
            { type: types.REFERENCE, value: 1 },
            char('>'),
          ],
        });
      }
    }
  })
  .export(module);
