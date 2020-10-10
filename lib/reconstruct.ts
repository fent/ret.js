import { types, Root, Token, Tokens, Group } from './types';
import * as sets from './sets';

const simplifications: [sets.SetFunc, string][] = [
  [sets.words, '\\w'],
  [sets.notWords, '\\W'],
  [sets.ints, '\\d'],
  [sets.notInts, '\\D'],
  [sets.whitespace, '\\s'],
  [sets.notWhitespace, '\\S'],
  [sets.anyChar, '.']
];

const reduceStack = (stack: Token[]): string => stack.map(partialConstruct).join('');

const createAlternate = (token: Root | Group): string => {
  if ('options' in token) {
    return token.options?.map(reduceStack).join('|') ?? ''
  } else if ('stack' in token) {
    return reduceStack(token.stack);
  } else {
    throw new Error(`options or stack must be within Root/Group: ${token}`);
  }
};

export const reconstruct = (regexpToken: Root): string => partialConstruct(regexpToken);

export const partialConstruct = (token: Tokens): string => {
  switch (token.type) {
    case types.ROOT:
      return createAlternate(token);
    case types.CHAR:
      const c = String.fromCharCode(token.value);
      return (/[[\]^.\/|?*+()]/.test(c) ? '\\' : '') + String.fromCharCode(token.value);
    case types.POSITION:
      if (token.value === '^' || token.value === '$') {
        return `${token.value}`;
      } else {
        return `\\${token.value}`;
      };
    case types.REFERENCE:
      return `\\${token.value}`;
    case types.SET:
      for (const [set, simplification] of simplifications) {
        if (JSON.stringify(set()) === JSON.stringify(token)) {
          return simplification;
        };
      };
      return `[${token.not ? '^' : ''}${reduceStack(token.set)}]`;
    case types.RANGE:
      return `${String.fromCharCode(token.from)}-${String.fromCharCode(token.to)}`;
    case types.GROUP:
      // Check token.remember
      return `(${!token.remember ? '?' : ''}${token.lookBehind ? '<' : ''}${token.followedBy ? '=' :
          token.notFollowedBy ? '!' :
            (token.remember ? '' : ':')
        }${createAlternate(token)})`
    case types.REPETITION:
      const { min, max } = token;
      let endWith;
      if (min === 0 && max === 1) {
        endWith = '?';
      } else if (min === 1 && max === Infinity) {
        endWith = '+';
      } else if (min === 0 && max === Infinity) {
        endWith = '*';
      } else {
        endWith = max === Infinity ? `{${min},}`
          : `{${min}${min === max ? `` : `,${max}`}}`;
      }
      return `${partialConstruct(token.value)}${endWith}`;
    default:
      throw new Error(`Invalid token type ${token}`);
  };
};
