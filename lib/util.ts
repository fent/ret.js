import { types, SetTokens } from './types';
import * as sets from './sets';

const CTRL = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^ ?';

/**
 * Finds character representations in str and convert all to
 * their respective characters.
 *
 * @param {string} str
 * @returns {string}
 */
export const strToChars = (str: string): string => {
  const charsRegex = /(\[\\b\])|(\\)?\\(?:u([A-F0-9]{4})|x([A-F0-9]{2})|(0?[0-7]{2})|c([@A-Z[\\\]^?])|([0tnvfr]))/g;
  type EscapedChar = '0' | 't' | 'n' | 'v' | 'f' | 'r' | undefined;
  return str.replace(charsRegex, (s, b, lbs, a16, b16, c8, dctrl, eslsh : EscapedChar) => {
    if (lbs) {
      return s;
    }

    let code: number = b ? 8 :
      a16 ? parseInt(a16, 16) :
        b16 ? parseInt(b16, 16) :
          c8 ? parseInt(c8, 8) :
            dctrl ? CTRL.indexOf(dctrl) : {
              0: 0,
              t: 9,
              n: 10,
              v: 11,
              f: 12,
              r: 13,
            }[eslsh];

    let c = String.fromCharCode(code);

    // Escape special regex characters.
    return /[[\]{}^$.|?*+()]/.test(c) ? `\\${c}` : c;
  });
};


/**
 * Turns class into tokens
 * reads str until it encounters a ] not preceeded by a \
 *
 * @param {string} str
 * @param {string} regexpStr
 * @returns {Array.<Array.<Object>, number>}
 */
export const tokenizeClass = (str: string, regexpStr: string): [SetTokens, number] => {
  let tokens: SetTokens = [], rs: string[] | null, c: string;
  const regexp =
  /\\(?:(w)|(d)|(s)|(W)|(D)|(S))|((?:(?:\\)(.)|([^\]\\]))-(((?:\\)])|(((?:\\)?([^\]])))))|(\])|(?:\\)?([^])/g;

  while ((rs = regexp.exec(str)) !== null) {
    const p = (rs[1] && sets.words()) ??
      (rs[2] && sets.ints()) ??
      (rs[3] && sets.whitespace()) ??
      (rs[4] && sets.notWords()) ??
      (rs[5] && sets.notInts()) ??
      (rs[6] && sets.notWhitespace()) ??
      (rs[7] && {
        type: types.RANGE,
        from: (rs[8] || rs[9]).charCodeAt(0),
        to: (c = rs[10]).charCodeAt(c.length - 1),
      }) ??
      ((c = rs[16]) && { type: types.CHAR, value: c.charCodeAt(0) });

    if (p) {
      tokens.push(p);
    } else {
      return [tokens, regexp.lastIndex];
    }
  }
  throw new SyntaxError(`Invalid regular expression: /${regexpStr}/: Unterminated character class`);
};
