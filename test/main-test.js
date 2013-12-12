var vows   = require('vows');
var assert = require('assert');
var sets   = require('../lib/sets');
var ret    = require('..');
var types  = ret.types;


vows.describe('Regexp Tokenizer')
  .addBatch({
    'No special characters': {
      topic: ret('walnuts'),

      'List of char tokens': function(t) {
        assert.deepEqual(t, {
            type: types.ROOT
          , stack: [
              { type: types.CHAR, value: 'w'.charCodeAt(0) }
            , { type: types.CHAR, value: 'a'.charCodeAt(0) }
            , { type: types.CHAR, value: 'l'.charCodeAt(0) }
            , { type: types.CHAR, value: 'n'.charCodeAt(0) }
            , { type: types.CHAR, value: 'u'.charCodeAt(0) }
            , { type: types.CHAR, value: 't'.charCodeAt(0) }
            , { type: types.CHAR, value: 's'.charCodeAt(0) }
          ]
        });
      }
    },


    'Positionals': {
      '^ and $ in': {
        'one liner': {
          topic: ret('^yes$'),
          'Positionals at beginning and end': function(t) {
            assert.deepEqual(t, {
                type: types.ROOT
              , stack: [
                  { type: types.POSITION, value: '^' }
                , { type: types.CHAR, value: 'y'.charCodeAt(0) }
                , { type: types.CHAR, value: 'e'.charCodeAt(0) }
                , { type: types.CHAR, value: 's'.charCodeAt(0) }
                , { type: types.POSITION, value: '$' }
              ]
            });
          }
        }
      },

      '\\b and \\B': {
        topic: ret('\\bbeginning'),
        'Word boundary at beginning': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.POSITION, value: 'b' }
              , { type: types.CHAR, value: 'b'.charCodeAt(0) }
              , { type: types.CHAR, value: 'e'.charCodeAt(0) }
              , { type: types.CHAR, value: 'g'.charCodeAt(0) }
              , { type: types.CHAR, value: 'i'.charCodeAt(0) }
              , { type: types.CHAR, value: 'n'.charCodeAt(0) }
              , { type: types.CHAR, value: 'n'.charCodeAt(0) }
              , { type: types.CHAR, value: 'i'.charCodeAt(0) }
              , { type: types.CHAR, value: 'n'.charCodeAt(0) }
              , { type: types.CHAR, value: 'g'.charCodeAt(0) }
            ]
          });
        }
      }
    },


    'Predefined sets': {
      'that represent a typical date format': {
        topic: ret('\\w \\d:\\d:\\d'),

        'Words class': function(t) {
          assert.isArray(t.stack);
          assert.deepEqual(t.stack[0], sets.words());
        },

        'Followed by a space': function(t) {
          assert.isArray(t.stack);
          assert.deepEqual(t.stack[1], {
              type: types.CHAR
            , value: ' '.charCodeAt(0)
          });
        },

        'Integer sets': function(t) {
          assert.isArray(t.stack);
          var ints = sets.ints();
          assert.deepEqual(t.stack[2], ints);
          assert.deepEqual(t.stack[4], ints);
          assert.deepEqual(t.stack[6], ints);
        },

        'Colons inbetween': function(t) {
          assert.isArray(t.stack);
          var colon = {
              type: types.CHAR
            , value: ':'.charCodeAt(0)
          };
          assert.deepEqual(t.stack[3], colon);
          assert.deepEqual(t.stack[5], colon);
        }
      }
    },


    'Custom sets': {
      'topic': ret('[$!a-z123] thing [^0-9]'),

      'Class contains all characters and range': function(t) {
        assert.deepEqual(t, {
            type: types.ROOT
          , stack: [
              {
                type: types.SET
              , set: [
                    { type: types.CHAR, value: '$'.charCodeAt(0) }
                  , { type: types.CHAR, value: '!'.charCodeAt(0) }
                  , {
                      type: types.RANGE
                    , from: 'a'.charCodeAt(0)
                    , to: 'z'.charCodeAt(0)
                    }
                  , { type: types.CHAR, value: '1'.charCodeAt(0) }
                  , { type: types.CHAR, value: '2'.charCodeAt(0) }
                  , { type: types.CHAR, value: '3'.charCodeAt(0) }
                ]
              , not: false
              }

            , { type: types.CHAR, value: ' '.charCodeAt(0) }
            , { type: types.CHAR, value: 't'.charCodeAt(0) }
            , { type: types.CHAR, value: 'h'.charCodeAt(0) }
            , { type: types.CHAR, value: 'i'.charCodeAt(0) }
            , { type: types.CHAR, value: 'n'.charCodeAt(0) }
            , { type: types.CHAR, value: 'g'.charCodeAt(0) }
            , { type: types.CHAR, value: ' '.charCodeAt(0) }

            , {
                type: types.SET
              , set: [{
                  type: types.RANGE
                , from: '0'.charCodeAt(0)
                , to: '9'.charCodeAt(0)
                }]
              , not: true
              }
          ]
        });
      }
    },

    'Two sets in a row with dash in between': {
      'topic': ret('[01]-[ab]'),
      'Contains both classes and no range': function(t) {
        assert.deepEqual(t, {
            type: types.ROOT
          , stack: [
              {
                type: types.SET
              , set: [
                  { type: types.CHAR, value: '0'.charCodeAt(0) }
                , { type: types.CHAR, value: '1'.charCodeAt(0) }
                ]
              , not: false
              }
            , { type: types.CHAR, value: '-'.charCodeAt(0) }
            , {
                type: types.SET
              , set: [
                  { type: types.CHAR, value: 'a'.charCodeAt(0) }
                , { type: types.CHAR, value: 'b'.charCodeAt(0) }
              ]
              , not: false
              }
            ]
        });
      }
    },


    '| (Pipe)': {
      topic: ret('foo|bar'),

      'Returns root object with options': function(t) {
        assert.deepEqual(t, {
            type: types.ROOT
          , options: [
              [
                { type: types.CHAR, value: 'f'.charCodeAt(0) }
              , { type: types.CHAR, value: 'o'.charCodeAt(0) }
              , { type: types.CHAR, value: 'o'.charCodeAt(0) }
              ]
            , [
                { type: types.CHAR, value: 'b'.charCodeAt(0) }
              , { type: types.CHAR, value: 'a'.charCodeAt(0) }
              , { type: types.CHAR, value: 'r'.charCodeAt(0) }
              ]
          ]
        });
      }
    },


    'Group': {
      'with no special characters': {
        topic: ret('hey (there)'),

        'Token list contains group token': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.CHAR, value: 'h'.charCodeAt(0) }
              , { type: types.CHAR, value: 'e'.charCodeAt(0) }
              , { type: types.CHAR, value: 'y'.charCodeAt(0) }
              , { type: types.CHAR, value: ' '.charCodeAt(0) }
              , {
                  type: types.GROUP
                , remember: true
                , stack: [
                    { type: types.CHAR, value: 't'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'h'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'e'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'r'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'e'.charCodeAt(0) }
                ]
              }
            ]
          });
        }
      },

      'that is not remembered': {
        topic: ret('(?:loner)'),

        'Remember is false on the group object': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [{
                type: types.GROUP
              , remember: false
              , stack: [
                  { type: types.CHAR, value: 'l'.charCodeAt(0) }
                , { type: types.CHAR, value: 'o'.charCodeAt(0) }
                , { type: types.CHAR, value: 'n'.charCodeAt(0) }
                , { type: types.CHAR, value: 'e'.charCodeAt(0) }
                , { type: types.CHAR, value: 'r'.charCodeAt(0) }
              ]
            }]
          });
        }
      },

      'matched previous clause if not followed by this': {
        topic: ret('what(?!ever)'),

        'Returns a group': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.CHAR, value: 'w'.charCodeAt(0) }
              , { type: types.CHAR, value: 'h'.charCodeAt(0) }
              , { type: types.CHAR, value: 'a'.charCodeAt(0) }
              , { type: types.CHAR, value: 't'.charCodeAt(0) }

              , {
                  type: types.GROUP
                , remember: false
                , notFollowedBy: true
                , stack: [
                    { type: types.CHAR, value: 'e'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'v'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'e'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'r'.charCodeAt(0) }
                ]
              }
            ]
          });
        }
      },

      'with subgroup': {
        topic: ret('a(b(c(?:d))fg) @_@'),

        'Groups within groups': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.CHAR, value: 'a'.charCodeAt(0) }

              , { type: types.GROUP
                , remember: true
                , stack: [
                    { type: types.CHAR, value: 'b'.charCodeAt(0) }
                  , { type: types.GROUP
                    , remember: true
                    , stack: [
                        { type: types.CHAR, value: 'c'.charCodeAt(0) }
                      , { type: types.GROUP
                        , remember: false
                        , stack: [
                          { type: types.CHAR, value: 'd'.charCodeAt(0) }
                        ] }
                    ] }
                  , { type: types.CHAR, value: 'f'.charCodeAt(0) }
                  , { type: types.CHAR, value: 'g'.charCodeAt(0) }
                ]}

              , { type: types.CHAR, value: ' '.charCodeAt(0) }
              , { type: types.CHAR, value: '@'.charCodeAt(0) }
              , { type: types.CHAR, value: '_'.charCodeAt(0) }
              , { type: types.CHAR, value: '@'.charCodeAt(0) }
            ]
          });
        }
      }
    },


    'Custom repetition with': {
      'exact amount': {
        topic: ret('(?:pika){2}'),

        'Min and max are the same': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.REPETITION , min: 2, max: 2
                , value: {
                    type: types.GROUP
                  , remember: false
                  , stack: [
                      { type: types.CHAR, value: 'p'.charCodeAt(0) }
                    , { type: types.CHAR, value: 'i'.charCodeAt(0) }
                    , { type: types.CHAR, value: 'k'.charCodeAt(0) }
                    , { type: types.CHAR, value: 'a'.charCodeAt(0) }
                  ]
                }}
            ]
          });
        }
      },

      'minimum amount only': {
        topic: ret('NO{6,}'),

        'To infinity': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.CHAR, value: 'N'.charCodeAt(0) }
              , { type: types.REPETITION, min: 6, max: Infinity
                , value: { type: types.CHAR, value: 'O'.charCodeAt(0) }}
            ]
          });
        }
      },

      'both minimum and maximum': {
        topic: ret('pika\\.\\.\\. chu{3,20}!{1,2}'),

        'Min and max differ and min < max': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.CHAR, value: 'p'.charCodeAt(0) }
              , { type: types.CHAR, value: 'i'.charCodeAt(0) }
              , { type: types.CHAR, value: 'k'.charCodeAt(0) }
              , { type: types.CHAR, value: 'a'.charCodeAt(0) }
              , { type: types.CHAR, value: '.'.charCodeAt(0) }
              , { type: types.CHAR, value: '.'.charCodeAt(0) }
              , { type: types.CHAR, value: '.'.charCodeAt(0) }
              , { type: types.CHAR, value: ' '.charCodeAt(0) }
              , { type: types.CHAR, value: 'c'.charCodeAt(0) }
              , { type: types.CHAR, value: 'h'.charCodeAt(0) }
              , { type: types.REPETITION, min: 3, max: 20,
                  value: { type: types.CHAR, value: 'u'.charCodeAt(0) }}
              , { type: types.REPETITION, min: 1, max: 2,
                  value: { type: types.CHAR, value: '!'.charCodeAt(0) }}
            ]
          });
        }
      }
    },


    'Predefined repetitional': {
      '? (Optional)': {
        topic: ret('hey(?: you)?'),

        'Get back correct min and max': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.CHAR, value: 'h'.charCodeAt(0) }
              , { type: types.CHAR, value: 'e'.charCodeAt(0) }
              , { type: types.CHAR, value: 'y'.charCodeAt(0) }
              , { type: types.REPETITION, min: 0, max: 1
                , value: { type: types.GROUP, remember: false
                  , stack: [
                      { type: types.CHAR, value: ' '.charCodeAt(0) }
                    , { type: types.CHAR, value: 'y'.charCodeAt(0) }
                    , { type: types.CHAR, value: 'o'.charCodeAt(0) }
                    , { type: types.CHAR, value: 'u'.charCodeAt(0) }
                  ]}}
            ]
          });
        }
      },

      '+ (At least one)': {
        topic: ret('(no )+'),

        'Correct min and max': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [{ type: types.REPETITION, min: 1, max: Infinity
                , value: { type: types.GROUP, remember: true
                  , stack: [
                      { type: types.CHAR, value: 'n'.charCodeAt(0) }
                    , { type: types.CHAR, value: 'o'.charCodeAt(0) }
                    , { type: types.CHAR, value: ' '.charCodeAt(0) }
                  ]}
              }]
          });
        }
      },

      '* (Any amount)': {
        topic: ret('XF*D'),

        '0 to Infinity': function(t) {
          assert.deepEqual(t, {
              type: types.ROOT
            , stack: [
                { type: types.CHAR, value: 'X'.charCodeAt(0) }
              , { type: types.REPETITION, min: 0, max: Infinity
                  , value: { type: types.CHAR, value: 'F'.charCodeAt(0) }}
              , { type: types.CHAR, value: 'D'.charCodeAt(0) }
              ]
          });
        }
      }
    },


    'Reference': {
      topic: ret('<(\\w+)>\\w*<\\1>'),

      'Reference a group': function(t) {
        assert.deepEqual(t, {
            type: types.ROOT
          , stack: [
                { type: types.CHAR, value: '<'.charCodeAt(0) }
              , { type: types.GROUP, remember: true
                , stack: [{ type: types.REPETITION, min: 1, max: Infinity
                  , value: sets.words()}] }
              , { type: types.CHAR, value: '>'.charCodeAt(0) }
              , { type: types.REPETITION, min: 0, max: Infinity
                , value: sets.words() }
              , { type: types.CHAR, value: '<'.charCodeAt(0) }
              , { type: types.REFERENCE, value: 1 }
              , { type: types.CHAR, value: '>'.charCodeAt(0) }
            ]
        });
      }
    }
  })
  .export(module);
