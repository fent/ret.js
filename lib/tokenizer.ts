import { Group, types, Root, Token, Reference, Char, Position, SetTokens, Set as SetToken } from './types';
import * as sets from './sets';

type ReferenceQueue = { reference: (Reference | Char), stack: Token[], index: number }[];
type DecodedEscape = { value: number, nextIndex: number } | null;
type ParsedNumber = { value: number, nextIndex: number } | null;
type EscapedToken = Char | Position | Reference | SetToken;
type EscapedTokenResult = { token: EscapedToken, nextIndex: number };
type ClassToken = Char | SetToken;
type ClassTokenResult = { token: ClassToken, nextIndex: number };
type RepetitionBounds = { min: number, max: number, nextIndex: number } | null;

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

const readNumber = (str: string, index: number): ParsedNumber => {
  if (!isDigitCode(str.charCodeAt(index))) {
    return null;
  }

  let value = 0;
  let nextIndex = index;
  while (nextIndex < str.length && isDigitCode(str.charCodeAt(nextIndex))) {
    value = value * 10 + str.charCodeAt(nextIndex) - 48;
    nextIndex++;
  }

  return { value, nextIndex };
};

const readEscapedChar = (str: string, slashIndex: number): DecodedEscape => {
  const escapeType = str[slashIndex + 1];

  switch (escapeType) {
    case 'u': {
      if (slashIndex + 5 >= str.length) {
        return null;
      }

      let value = 0;
      for (let index = slashIndex + 2; index <= slashIndex + 5; index++) {
        const charCode = str.charCodeAt(index);
        if (!isUpperHexCode(charCode)) {
          return null;
        }
        value = value * 16 + hexValue(charCode);
      }
      return { value, nextIndex: slashIndex + 6 };
    }

    case 'x': {
      if (slashIndex + 3 >= str.length) {
        return null;
      }

      let value = 0;
      for (let index = slashIndex + 2; index <= slashIndex + 3; index++) {
        const charCode = str.charCodeAt(index);
        if (!isUpperHexCode(charCode)) {
          return null;
        }
        value = value * 16 + hexValue(charCode);
      }
      return { value, nextIndex: slashIndex + 4 };
    }

    case 'c': {
      const ctrlChar = str[slashIndex + 2];
      if (!ctrlChar) {
        return null;
      }

      const value = CTRL.indexOf(ctrlChar);
      return value === -1 ? null : { value, nextIndex: slashIndex + 3 };
    }

    case '0':
      return { value: 0, nextIndex: slashIndex + 2 };

    case 't':
      return { value: 9, nextIndex: slashIndex + 2 };

    case 'n':
      return { value: 10, nextIndex: slashIndex + 2 };

    case 'v':
      return { value: 11, nextIndex: slashIndex + 2 };

    case 'f':
      return { value: 12, nextIndex: slashIndex + 2 };

    case 'r':
      return { value: 13, nextIndex: slashIndex + 2 };

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

const readEscapedToken = (str: string, slashIndex: number, inClass: boolean): EscapedTokenResult => {
  const escapedType = str[slashIndex + 1];
  const setToken = readSet(escapedType);
  if (setToken) {
    return { token: setToken, nextIndex: slashIndex + 2 };
  }

  if (inClass) {
    // Character classes treat \b as backspace instead of a word boundary.
    if (escapedType === 'b') {
      return { token: { type: types.CHAR, value: 8 }, nextIndex: slashIndex + 2 };
    }
  } else {
    if (escapedType === 'b' || escapedType === 'B') {
      return {
        token: { type: types.POSITION, value: escapedType },
        nextIndex: slashIndex + 2,
      };
    }

    // Outside character classes, decimal escapes are parsed as references first
    // and only normalized to chars later if there are not enough capture groups.
    if (escapedType !== '0') {
      const reference = readNumber(str, slashIndex + 1);
      if (reference) {
        return {
          token: { type: types.REFERENCE, value: reference.value },
          nextIndex: reference.nextIndex,
        };
      }
    }
  }

  const decoded = readEscapedChar(str, slashIndex);
  return {
    token: {
      type: types.CHAR,
      value: decoded ? decoded.value : str.charCodeAt(slashIndex + 1),
    },
    nextIndex: decoded ? decoded.nextIndex : slashIndex + 2,
  };
};

const readClassToken = (str: string, index: number): ClassTokenResult => {
  if (str[index] === '\\') {
    return readEscapedToken(str, index, true) as ClassTokenResult;
  }

  return {
    token: { type: types.CHAR, value: str.charCodeAt(index) },
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
    const nextChar = str[first.nextIndex];
    if (
      first.token.type === types.CHAR &&
      nextChar === '-' &&
      first.nextIndex + 1 < str.length &&
      str[first.nextIndex + 1] !== ']'
    ) {
      // Only char-to-char pairs become ranges; predefined sets keep the dash literal.
      const second = readClassToken(str, first.nextIndex + 1);
      if (second.token.type === types.CHAR) {
        tokens.push({
          type: types.RANGE,
          from: first.token.value,
          to: second.token.value,
        });
        i = second.nextIndex;
        continue;
      }
    }

    tokens.push(first.token);
    i = first.nextIndex;
  }

  throw new SyntaxError(`Invalid regular expression: /${regexpStr}/: Unterminated character class`);
};

const readRepetition = (str: string, index: number): RepetitionBounds => {
  const min = readNumber(str, index);
  if (!min) {
    return null;
  }

  if (str[min.nextIndex] === '}') {
    return { min: min.value, max: min.value, nextIndex: min.nextIndex + 1 };
  }

  if (str[min.nextIndex] !== ',') {
    return null;
  }

  // `{n,}` is open-ended, while `{n,m}` requires a second parsed integer.
  if (str[min.nextIndex + 1] === '}') {
    return { min: min.value, max: Infinity, nextIndex: min.nextIndex + 2 };
  }

  const max = readNumber(str, min.nextIndex + 1);
  if (!max || str[max.nextIndex] !== '}') {
    return null;
  }

  return { min: min.value, max: max.value, nextIndex: max.nextIndex + 1 };
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

  const repeatErr = (col: number) => {
    throw new SyntaxError(
      `Invalid regular expression: /${
        regexpStr
      }/: Nothing to repeat at column ${col - 1}`,
    );
  };

  const str = regexpStr;

  // Iterate through each character in string.
  while (i < str.length) {
    switch (c = str[i++]) {
      // Handle escaped characters, inclues a few sets.
      case '\\': {
        if (i === str.length) {
          throw new SyntaxError(
            `Invalid regular expression: /${
              regexpStr
            }/: \\ at end of pattern`,
          );
        }
        const escaped = readEscapedToken(str, i - 1, false);
        last.push(escaped.token);
        if (escaped.token.type === types.REFERENCE) {
          referenceQueue.push({ reference: escaped.token, stack: last, index: last.length - 1 });
        }
        i = escaped.nextIndex;

        break;
      }


      // Positionals.
      case '^':
        last.push({ type: types.POSITION, value: '^' });
        break;

      case '$':
        last.push({ type: types.POSITION, value: '$' });
        break;


      // Handle custom sets.
      case '[': {
        // Check if this class is 'anti' i.e. [^abc].
        let not;
        if (str[i] === '^') {
          not = true;
          i++;
        } else {
          not = false;
        }

        // Get all the characters in class.
        let classTokens = tokenizeClassAt(str, i, regexpStr);
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
            let name = '';

            if (captureGroupFirstChar.test(str[i])) {
              name += str[i];
              i++;
            } else {
              throw new SyntaxError(
                `Invalid regular expression: /${
                  regexpStr
                }/: Invalid capture group name, character '${str[i]}'` +
                ` after '<' at column ${i + 1}`,
              );
            }

            while (i < str.length && captureGroupChars.test(str[i])) {
              name += str[i];
              i++;
            }

            if (!name) {
              throw new SyntaxError(
                `Invalid regular expression: /${
                  regexpStr
                }/: Invalid capture group name, character '${str[i]}'` +
                ` after '<' at column ${i + 1}`,
              );
            }

            if (str[i] !== '>') {
              throw new SyntaxError(
                `Invalid regular expression: /${
                  regexpStr
                }/: Unclosed capture group name, expected '>', found` +
                ` '${str[i]}' at column ${i + 1}`,
              );
            }

            group.name = name;
            i++;
          } else if (c === ':') {
            group.remember = false;
          } else {
            throw new SyntaxError(
              `Invalid regular expression: /${
                regexpStr
              }/: Invalid group, character '${c}'` +
              ` after '?' at column ${i - 1}`,
            );
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
          throw new SyntaxError(
            `Invalid regular expression: /${
              regexpStr
            }/: Unmatched ) at column ${i - 1}`,
          );
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
        let stack: Token[] = [];
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
        let repetition = readRepetition(str, i);
        if (repetition !== null) {
          if (last.length === 0) {
            repeatErr(i);
          }
          i = repetition.nextIndex;

          last.push({
            type: types.REPETITION,
            min: repetition.min,
            max: repetition.max,
            value: last.pop(),
          });
        } else {
          last.push({
            type: types.CHAR,
            value: 123,
          });
        }

        break;
      }

      case '?':
        if (last.length === 0) {
          repeatErr(i);
        }
        last.push({
          type: types.REPETITION,
          min: 0,
          max: 1,
          value: last.pop(),
        });
        break;

      case '+':
        if (last.length === 0) {
          repeatErr(i);
        }
        last.push({
          type: types.REPETITION,
          min: 1,
          max: Infinity,
          value: last.pop(),
        });

        break;

      case '*':
        if (last.length === 0) {
          repeatErr(i);
        }
        last.push({
          type: types.REPETITION,
          min: 0,
          max: Infinity,
          value: last.pop(),
        });

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
    throw new SyntaxError(
      `Invalid regular expression: /${
        regexpStr
      }/: Unterminated group`,
    );
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
