import { types } from './types';

type Base<T, K> = { type: T } & K

type ValueType<T, K> = Base<T, { value: K }>

export type Root = Base<types.ROOT, {
  stack?: Token[];
  options?: Token[][];
  flags?: string[];
}>

export type Group = Base<types.GROUP, {
  stack?: Token[];
  options?: Token[][];
  remember: boolean;
  /** `(?=...)`, or `(?<=...)` with `lookBehind`. Zero-width; `remember` is false. */
  followedBy?: boolean;
  /** `(?!...)`, or `(?<!...)` with `lookBehind`. Zero-width; `remember` is false. */
  notFollowedBy?: boolean;
  /** With `followedBy` or `notFollowedBy`: the assertion looks behind the current position. */
  lookBehind?: boolean;
  name?: string;
  modifier?: {
    ignoreCase: boolean | null;
    multiline: boolean | null;
    dotAll: boolean | null;
  };
}>

export type Set = Base<types.SET, {
  set: SetTokens;
  not: boolean;
}>

export type Range = Base<types.RANGE, {
  from: number;
  to: number;
}>

export type Repetition = Base<types.REPETITION, {
  min: number;
  max: number;
  value: Token;
}>

export type Position = ValueType<types.POSITION, '$' | '^' | 'b' | 'B'>
export type Reference = ValueType<types.REFERENCE, number>
export type Char = ValueType<types.CHAR, number>

export type Token = Group | Position | Set | Repetition | Reference | Char;
export type Tokens = Root | Token;

export type SetToken = Range | Char | Set;
export type SetTokens = SetToken[];
