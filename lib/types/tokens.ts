import { types } from './types'

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
  followedBy?: boolean;
  notFollowedBy?: boolean;
  lookBehind?: boolean;
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

export type Position  = ValueType<types.POSITION, '$' | '^' | 'b' | 'B'>
export type Reference = ValueType<types.REFERENCE, number>
export type Char      = ValueType<types.CHAR, number>

export type Token =  Group | Position | Set | Range | Repetition | Reference | Char
export type Tokens = Root | Token

export type SetTokens = (Range | Char | Set)[]
