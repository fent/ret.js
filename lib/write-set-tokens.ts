import { types, Set, Range, Char, SetTokens } from './types';
import * as sets from './sets-lookup';

/**
 * Takes character code and returns character to be displayed in a set
 * @param {number} charCode Character code of set element
 * @param {boolean} isFirstChar True if character is the first character of the set
 * @param {boolean} isLastChar True if character is the last character of the set
 * @returns {string} The string for the sets character
 */
export function setChar(charCode: number, isFirstChar: boolean, isLastChar = false): string {
  // We only need to negate first internal '^' if token.not is false
  return isFirstChar && charCode === 94 ? '\\^' :
    charCode === 92 ? '\\\\' :
      charCode === 93 ? '\\]' :
        charCode === 45 && !isLastChar ? '\\-' :
          String.fromCharCode(charCode);
}

/**
 * Test if a character set matches a 'set-lookup'
 * @param {SetTokens} set The set to be tested
 * @param {Record<string | number, boolean>} map The predefined 'set-lookup'
 * @returns {boolean} True if the character set corresponds to the 'set-lookup'
 */
function isSameSet(set: SetTokens, map: Record<string | number, boolean>): boolean {
  for (const elem of set) {
    if (elem.type === types.SET) {
      return false;
    }
    const key = elem.type === types.CHAR ? elem.value : `${elem.from}-${elem.to}`;
    if (map[key]) {
      map[key] = false;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Writes the tokens for a set
 * @param {Set} set The set to display
 * @param {boolean} isFirstChar Whether subset contains the first character of the set
 * @param {boolean} isNested Whether the token is nested inside another set token
 * @returns {string} The tokens for the set
 */
export function writeSetTokens(set: Set, isFirstChar: boolean, isNested = false): string {
  const len = set.set.length;
  if (len === 1) {
    // Ints case
    const [token] = set.set;
    if (token.type === types.RANGE && token.from === 48 && token.to === 57) {
      return set.not ? '\\D' : '\\d';
    }
  } else if (len === 4) {
    if (isSameSet(set.set, sets.WORDS())) {
      return set.not ? '\\W' : '\\w';
    }
    // Notanychar is only relevant when not nested inside another set token
    if (!isNested && set.not && isSameSet(set.set, sets.NOTANYCHAR())) {
      return '.';
    }
  } else if (len === 15 && isSameSet(set.set, sets.WHITESPACE())) {
    return set.not ? '\\S' : '\\s';
  }
  let isFirstCharTemp = isFirstChar;
  let tokenString = '';
  for (let i = 0; i < len; i++) {
    const subset = set.set[i];
    tokenString += writeSetToken(subset, isFirstCharTemp, i === len - 1);
    // Only cancel out firstChar condition when we reach first non empty
    // set in the sequence
    isFirstCharTemp = isFirstCharTemp && subset.type === types.SET && subset.set.length === 0;
  }
  const contents = `${set.not ? '^' : ''}${tokenString}`;
  return isNested ? contents : `[${contents}]`;
}

/**
 * Writes a token within a set
 * @param {Range | Char | Set} set The set token to display
 * @param {boolean} isFirstChar Whether subset contains the first character of the set
 * @param {boolean} isLastChar True if character is the last character of the set
 * @returns {string} The token as a string
 */
function writeSetToken(set: Range | Char | Set, isFirstChar: boolean, isLastChar: boolean): string {
  if (set.type === types.CHAR) {
    return setChar(set.value, isFirstChar, isLastChar);
  } else if (set.type === types.RANGE) {
    return `${setChar(set.from, isFirstChar)}-${setChar(set.to, false, true)}`;
  }
  return writeSetTokens(set, isFirstChar, true);
}
