import * as Sets from './sets';
import { SetTokens, types } from './types';

function setToLookup(tokens: SetTokens) {
  let lookup: Record<string | number, boolean> = {};
  let len = 0;
  for (const token of tokens) {
    if (token.type === types.CHAR) {
      lookup[token.value] = true;
    }
    // Note this is in an if statement because
    // the SetTokens type is (Char | Range | Set)[]
    // so a type error is thrown if it is not.
    // If the SetTokens type is modified the if statement
    // can be removed
    if (token.type === types.RANGE) {
      lookup[`${token.from}-${token.to}`] = true;
    }
    len += 1;
  }
  return {
    lookup: () => ({ ...lookup }),
    len,
  };
}

export const INTS = setToLookup(Sets.ints().set);
export const WORDS = setToLookup(Sets.words().set);
export const WHITESPACE = setToLookup(Sets.whitespace().set);
export const NOTANYCHAR = setToLookup(Sets.anyChar().set);
