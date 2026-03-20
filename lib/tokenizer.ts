import { Group, types, Root, Token, Reference, Char, Position, SetTokens, Set as SetToken } from './types';
import * as sets from './sets';

type ReferenceQueue = { reference: (Reference | Char), stack: Token[], index: number }[];
type ReadResult<T> = { result: T, nextIndex: number };
type MaybeReadResult<T> = ReadResult<T> | null;
type EscapedToken = Char | Position | Reference | SetToken;
type ClassToken = Char | SetToken;
type RepetitionBounds = { min: number, max: number };

/**
 * Valid opening characters for capture group names.
 */
const captureGroupFirstChar = /^[a-zA-Z_$]$/i;

/**
 * Valid characters for capture group names.
 */
const captureGroupChars = /^[a-zA-Z0-9_$]$/i;

const CTRL = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^ ?';

const isDigitCode = (charCode: number) => charCode >= 48 && charCode <= 57;

const isUpperHexCode = (charCode: number) =>
  isDigitCode(charCode) || (charCode >= 65 && charCode <= 70);

const hexValue = (charCode: number) => charCode <= 57 ? charCode - 48 : charCode - 55;

const syntaxError = (regexpStr: string, message: string) =>
  new SyntaxError(`Invalid regular expression: /${regexpStr}/: ${message}`);

const readNumber = (str: string, index: number): MaybeReadResult<number> => {
  if (!isDigitCode(str.charCodeAt(index))) {
    return null;
  }

  let value = 0;
  let nextIndex = index;
  while (nextIndex < str.length && isDigitCode(str.charCodeAt(nextIndex))) {
    value = value * 10 + str.charCodeAt(nextIndex) - 48;
    nextIndex++;
  }

  return { result: value, nextIndex };
};

const readHex = (str: string, index: number, length: number): MaybeReadResult<number> => {
  if (index + length > str.length) {
    return null;
  }

  let value = 0;
  for (let i = index; i < index + length; i++) {
    const charCode = str.charCodeAt(i);
    if (!isUpperHexCode(charCode)) {
      return null;
    }
    value = value * 16 + hexValue(charCode);
  }

  return { result: value, nextIndex: index + length };
};

const readEscapedChar = (str: string, slashIndex: number): MaybeReadResult<number> => {
  switch (str[slashIndex + 1]) {
    case 'u':
      return readHex(str, slashIndex + 2, 4);

    case 'x':
      return readHex(str, slashIndex + 2, 2);

    case 'c': {
      const value = CTRL.indexOf(str[slashIndex + 2]);
      return value === -1 ? null : { result: value, nextIndex: slashIndex + 3 };
    }

    case '0':
      return { result: 0, nextIndex: slashIndex + 2 };

    case 't':
      return { result: 9, nextIndex: slashIndex + 2 };

    case 'n':
      return { result: 10, nextIndex: slashIndex + 2 };

    case 'v':
      return { result: 11, nextIndex: slashIndex + 2 };

    case 'f':
      return { result: 12, nextIndex: slashIndex + 2 };

    case 'r':
      return { result: 13, nextIndex: slashIndex + 2 };

    default:
      return null;
  }
};

const readSet = (escapedType: string): SetToken | null => {
  switch (escapedType) {
    case 'w':
      return sets.words();
    case 'W':
      return sets.notWords();
    case 'd':
      return sets.ints();
    case 'D':
      return sets.notInts();
    case 's':
      return sets.whitespace();
    case 'S':
      return sets.notWhitespace();
    default:
      return null;
  }
};

function readEscapedToken(str: string, slashIndex: number, inClass: true): ReadResult<ClassToken>;
function readEscapedToken(str: string, slashIndex: number, inClass: false): ReadResult<EscapedToken>;
function readEscapedToken(str: string, slashIndex: number, inClass: boolean): ReadResult<EscapedToken> {
  const escapedType = str[slashIndex + 1];
  const setToken = readSet(escapedType);
  if (setToken) {
    return { result: setToken, nextIndex: slashIndex + 2 };
  }

  if (inClass) {
    // Character classes treat \b as backspace instead of a word boundary.
    if (escapedType === 'b') {
      return { result: { type: types.CHAR, value: 8 }, nextIndex: slashIndex + 2 };
    }
  } else {
    if (escapedType === 'b' || escapedType === 'B') {
      return {
        result: { type: types.POSITION, value: escapedType },
        nextIndex: slashIndex + 2,
      };
    }

    // Outside character classes, decimal escapes are parsed as references first
    // and only normalized to chars later if there are not enough capture groups.
    if (escapedType !== '0') {
      const reference = readNumber(str, slashIndex + 1);
      if (reference) {
        return {
          result: { type: types.REFERENCE, value: reference.result },
          nextIndex: reference.nextIndex,
        };
      }
    }
  }

  const decoded = readEscapedChar(str, slashIndex);
  return {
    result: {
      type: types.CHAR,
      value: decoded ? decoded.result : str.charCodeAt(slashIndex + 1),
    },
    nextIndex: decoded ? decoded.nextIndex : slashIndex + 2,
  };
}

const readClassToken = (str: string, index: number): ReadResult<ClassToken> => {
  if (str[index] === '\\') {
    return readEscapedToken(str, index, true);
  }

  return {
    result: { type: types.CHAR, value: str.charCodeAt(index) },
    nextIndex: index + 1,
  };
};

const tokenizeClassAt = (str: string, index: number, regexpStr: string): [SetTokens, number] => {
  const tokens: SetTokens = [];
  let i = index;

  while (i < str.length) {
    if (str[i] === ']') {
      return [tokens, i + 1];
    }

    if (str[i] === '\\' && i + 1 >= str.length) {
      break;
    }

    const first = readClassToken(str, i);
    if (
      first.result.type === types.CHAR &&
      str[first.nextIndex] === '-' &&
      first.nextIndex + 1 < str.length &&
      str[first.nextIndex + 1] !== ']'
    ) {
      // Only char-to-char pairs become ranges; predefined sets keep the dash literal.
      const second = readClassToken(str, first.nextIndex + 1);
      if (second.result.type === types.CHAR) {
        tokens.push({
          type: types.RANGE,
          from: first.result.value,
          to: second.result.value,
        });
        i = second.nextIndex;
        continue;
      }
    }

    tokens.push(first.result);
    i = first.nextIndex;
  }

  throw syntaxError(regexpStr, 'Unterminated character class');
};

const readRepetition = (str: string, index: number): MaybeReadResult<RepetitionBounds> => {
  const min = readNumber(str, index);
  if (!min) {
    return null;
  }

  if (str[min.nextIndex] === '}') {
    return { result: { min: min.result, max: min.result }, nextIndex: min.nextIndex + 1 };
  }

  if (str[min.nextIndex] !== ',') {
    return null;
  }

  // `{n,}` is open-ended, while `{n,m}` requires a second parsed integer.
  if (str[min.nextIndex + 1] === '}') {
    return { result: { min: min.result, max: Infinity }, nextIndex: min.nextIndex + 2 };
  }

  const max = readNumber(str, min.nextIndex + 1);
  if (!max || str[max.nextIndex] !== '}') {
    return null;
  }

  return { result: { min: min.result, max: max.result }, nextIndex: max.nextIndex + 1 };
};

const readGroupName = (str: string, index: number, regexpStr: string): ReadResult<string> => {
  if (!captureGroupFirstChar.test(str[index])) {
    throw syntaxError(
      regexpStr,
      `Invalid capture group name, character '${str[index]}' after '<' at column ${index + 1}`,
    );
  }

  let name = str[index++];
  while (index < str.length && captureGroupChars.test(str[index])) {
    name += str[index++];
  }

  if (str[index] !== '>') {
    throw syntaxError(
      regexpStr,
      `Unclosed capture group name, expected '>', found '${str[index]}' at column ${index + 1}`,
    );
  }

  return { result: name, nextIndex: index + 1 };
};

/**
 * Tokenizes a regular expression (that is currently a string)
 * @param {string} regexpStr String of regular expression to be tokenized
 *
 * @returns {Root}
 */
export const tokenizer = (regexpStr: string): Root => {
  let i = 0, c: string;
  let start: Root = { type: types.ROOT, stack: [] };

  // Keep track of last clause/group and stack.
  let lastGroup: Group | Root = start;
  let last: Token[] = start.stack;
  let groupStack: (Group | Root)[] = [];

  let referenceQueue: ReferenceQueue = [];
  let groupCount = 0;

  const repeatErr = (col: number): never => {
    throw syntaxError(regexpStr, `Nothing to repeat at column ${col - 1}`);
  };

  const pushRepetition = (min: number, max: number, col: number) => {
    if (last.length === 0) {
      repeatErr(col);
    }

    last.push({
      type: types.REPETITION,
      min,
      max,
      value: last.pop()!,
    });
  };

  const str = regexpStr;

  // Iterate through each character in string.
  while (i < str.length) {
    switch (c = str[i++]) {
      // Handle escaped characters, inclues a few sets.
      case '\\': {
        if (i === str.length) {
          throw syntaxError(regexpStr, '\\ at end of pattern');
        }
        const escaped = readEscapedToken(str, i - 1, false);
        last.push(escaped.result);
        if (escaped.result.type === types.REFERENCE) {
          referenceQueue.push({ reference: escaped.result, stack: last, index: last.length - 1 });
        }
        i = escaped.nextIndex;

        break;
      }


      // Positionals.
      case '^':
      case '$':
        last.push({ type: types.POSITION, value: c });
        break;


      // Handle custom sets.
      case '[': {
        // Check if this class is 'anti' i.e. [^abc].
        const not = str[i] === '^';
        if (not) i++;

        // Get all the characters in class.
        const classTokens = tokenizeClassAt(str, i, regexpStr);
        i = classTokens[1];
        last.push({
          type: types.SET,
          set: classTokens[0],
          not,
        });

        break;
      }


      // Class of any character except \n.
      case '.':
        last.push(sets.anyChar());
        break;


      // Push group onto stack.
      case '(': {
        // Create group.
        let group: Group = {
          type: types.GROUP,
          stack: [],
          remember: true,
        };

        // If this is a special kind of group.
        if (str[i] === '?') {
          c = str[i + 1];
          i += 2;

          // Match if followed by.
          if (c === '=') {
            group.followedBy = true;
            group.remember = false;

          // Match if not followed by.
          } else if (c === '!') {
            group.notFollowedBy = true;
            group.remember = false;
          } else if (c === '<') {
            const name = readGroupName(str, i, regexpStr);
            group.name = name.result;
            i = name.nextIndex;
          } else if (c === ':') {
            group.remember = false;
          } else {
            throw syntaxError(regexpStr, `Invalid group, character '${c}' after '?' at column ${i - 1}`);
          }
        } else {
          groupCount += 1;
        }

        // Insert subgroup into current group stack.
        last.push(group);

        // Remember the current group for when the group closes.
        groupStack.push(lastGroup);

        // Make this new group the current group.
        lastGroup = group;
        last = group.stack;

        break;
      }


      // Pop group out of stack.
      case ')':
        if (groupStack.length === 0) {
          throw syntaxError(regexpStr, `Unmatched ) at column ${i - 1}`);
        }
        lastGroup = groupStack.pop();

        // Check if this group has a PIPE.
        // To get back the correct last stack.
        last = lastGroup.options ?
          lastGroup.options[lastGroup.options.length - 1] :
          lastGroup.stack;

        break;


      // Use pipe character to give more choices.
      case '|': {
        // Create array where options are if this is the first PIPE
        // in this clause.
        if (!lastGroup.options) {
          lastGroup.options = [lastGroup.stack];
          delete lastGroup.stack;
        }
        // Create a new stack and add to options for rest of clause.
        const stack: Token[] = [];
        lastGroup.options.push(stack);
        last = stack;

        break;
      }


      // Repetition.
      // For every repetition, remove last element from last stack
      // then insert back a RANGE object.
      // This design is chosen because there could be more than
      // one repetition symbols in a regex i.e. `a?+{2,3}`.
      case '{': {
        const repetition = readRepetition(str, i);
        if (!repetition) {
          last.push({
            type: types.CHAR,
            value: 123,
          });
          break;
        }

        pushRepetition(repetition.result.min, repetition.result.max, i);
        i = repetition.nextIndex;

        break;
      }

      case '?':
        pushRepetition(0, 1, i);
        break;

      case '+':
        pushRepetition(1, Infinity, i);
        break;

      case '*':
        pushRepetition(0, Infinity, i);
        break;


      // Default is a character that is not `\[](){}?+*^$`.
      default:
        last.push({
          type: types.CHAR,
          value: c.charCodeAt(0),
        });
    }
  }

  // Check if any groups have not been closed.
  if (groupStack.length !== 0) {
    throw syntaxError(regexpStr, 'Unterminated group');
  }

  updateReferences(referenceQueue, groupCount);

  return start;
};

/**
 * This is a side effecting function that changes references to chars
 * if there are not enough capturing groups to reference
 * See: https://github.com/fent/ret.js/pull/39#issuecomment-1006475703
 * See: https://github.com/fent/ret.js/issues/38
 * @param {(Reference | Char)[]} referenceQueue
 * @param {number} groupCount
 * @returns {void}
 */
function updateReferences(referenceQueue: ReferenceQueue, groupCount: number) {
  // Note: We go through the queue in reverse order so
  // that index we use is correct even if we have to add
  // multiple tokens to one stack
  for (const elem of referenceQueue.reverse()) {
    if (groupCount < elem.reference.value) {
      // If there is nothing to reference then turn this into a char token
      elem.reference.type = types.CHAR;

      const valueString = elem.reference.value.toString();
      elem.reference.value = parseInt(valueString, 8);
      // If the number is not octal then we need to create multiple tokens
      // https://github.com/fent/ret.js/pull/39#issuecomment-1008229226
      if (!/^[0-7]+$/.test(valueString)) {
        let i = 0;

        while (valueString[i] !== '8' && valueString[i] !== '9') {
          i += 1;
        }

        if (i === 0) {
          // Handling case when escaped number starts with 8 or 9
          elem.reference.value = valueString.charCodeAt(0);
          i += 1;
        } else {
          // If the escaped number does not start with 8 or 9, then all
          // 0-7 digits before the first 8/9 form the first character code
          // see: https://github.com/fent/ret.js/pull/39#discussion_r780747085
          elem.reference.value = parseInt(valueString.slice(0, i), 8);
        }

        if (valueString.length > i) {
          const tail = elem.stack.splice(elem.index + 1);

          for (const char of valueString.slice(i)) {
            elem.stack.push({
              type: types.CHAR,
              value: char.charCodeAt(0),
            });
          }
          elem.stack.push(...tail);
        }
      }
    }
  }
}
