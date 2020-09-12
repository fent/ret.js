import { types, Range, Char, Set } from './types'
import * as sets from './sets'

type tokenClsArr = (Range | Char | Set)[]

const CTRL = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^ ?';
const SLSH = { '0': 0, 't': 9, 'n': 10, 'v': 11, 'f': 12, 'r': 13 };

/**
 * Finds character representations in str and convert all to
 * their respective characters.
 *
 * @param {string} str
 * @return {string}
 */
export const strToChars = (str: string) => {
  /* jshint maxlen: false */
  const charsRegex = /(\[\\b\])|(\\)?\\(?:u([A-F0-9]{4})|x([A-F0-9]{2})|(0?[0-7]{2})|c([@A-Z[\\\]^?])|([0tnvfr]))/g;
  return str.replace(charsRegex, (s, b, lbs, a16, b16, c8, dctrl, eslsh) => {
    if (lbs) {
      return s;
    }

    let code: number | undefined = b ? 8 :
      a16   ? parseInt(a16, 16) :
      b16   ? parseInt(b16, 16) :
      c8    ? parseInt(c8,   8) :
      dctrl ? CTRL.indexOf(dctrl) :
      eslsh == '0' ? 0 :
      eslsh == 't' ? 9 :
      eslsh == 'n' ? 10 :
      eslsh == 'v' ? 11 :
      eslsh == 'f' ? 12 :
      eslsh == 'r' ? 13 : undefined;

    if (!code)
      throw new Error(`Code is undefined`)

    let c = String.fromCharCode(code);

    // Escape special regex characters.
    if (/[[\]{}^$.|?*+()]/.test(c)) {
      c = '\\' + c;
    }

    return c;
  });
};


/**
 * turns class into tokens
 * reads str until it encounters a ] not preceeded by a \
 *
 * @param {string} str
 * @param {string} regexpStr
 * @return {Array.<Array.<Object>, number>}
 */
export const tokenizeClass = (str: string, regexpStr: string): [tokenClsArr, number] => {
  let tokens: tokenClsArr = [], rs: string[] | null, c: string;
  const regexp = /\\(?:(w)|(d)|(s)|(W)|(D)|(S))|((?:(?:\\)(.)|([^\]\\]))-(?:\\)?([^\]]))|(\])|(?:\\)?([^])/g;

  while ((rs = regexp.exec(str)) != null) {
    const p = (rs[1] && sets.words())
      ?? (rs[2] && sets.ints())
      ?? (rs[3] && sets.whitespace())
      ?? (rs[4] && sets.notWords())
      ?? (rs[5] && sets.notInts())
      ?? (rs[6] && sets.notWhitespace())
      ?? (rs[7] && {
        type: types.RANGE,
        from: (rs[8] || rs[9]).charCodeAt(0),
        to: rs[10].charCodeAt(0)
      })
      ?? ((c = rs[12]) && { type: types.CHAR, value: c.charCodeAt(0) })

    if (p) 
      tokens.push(p);
    else 
      return [tokens, regexp.lastIndex];
  }
  error(regexpStr, 'Unterminated character class')
  throw new SyntaxError(`Invalid regular expression: ${str}: Unterminated character class`)
};


/**
 * Shortcut to throw errors.
 *
 * @param {string} regexp
 * @param {string} msg
 */
export const error = (regexp: string, msg: string) => {
  throw new SyntaxError('Invalid regular expression: /' + regexp + '/: ' + msg);
};
