var types = require('./types');

var _WHITESPACE = [];
var _NOTANYCHAR = [];
for (var i = 0; i < 65536; i++) {
  if (!/./.test(String.fromCharCode(i))) _NOTANYCHAR.push(i);
  if (/\s/.test(String.fromCharCode(i))) _WHITESPACE.push(i);
}


var INTS = function() {
 return [{ type: types.RANGE , from: 48, to: 57 }];
};

var WORDS = function() {
 return [
      { type: types.CHAR, value: 95 }
    , { type: types.RANGE, from: 97, to: 122 }
    , { type: types.RANGE, from: 65, to: 90 }
  ].concat(INTS());
};

var WHITESPACE = function() {
  return _WHITESPACE.map(function (value) {
    return {type: types.CHAR, value: value}
  });
};

var NOTANYCHAR = function() {
  return _NOTANYCHAR.map(function (value) {
    return {type: types.CHAR, value: value}
  });
};

// predefined class objects
exports.words = function() {
  return { type: types.SET, set: WORDS(), not: false };
};

exports.notWords = function() {
  return { type: types.SET, set: WORDS(), not: true };
};

exports.ints = function() {
  return { type: types.SET, set: INTS(), not: false };
};

exports.notInts = function() {
  return { type: types.SET, set: INTS(), not: true };
};

exports.whitespace = function() {
  return { type: types.SET, set: WHITESPACE(), not: false };
};

exports.notWhitespace = function() {
  return { type: types.SET, set: WHITESPACE(), not: true };
};

exports.anyChar = function() {
  return { type: types.SET, set: NOTANYCHAR(), not: true };
};
