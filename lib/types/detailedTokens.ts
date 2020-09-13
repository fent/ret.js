import { types } from '..'
import { Char, Group, Reference, Repetition, Root, Token, Position, Range, Set } from './tokens'

type details = {
  minChar : number;
  maxChar : number;
  regexpstr: string;
  regexp : RegExp;
  fixed: boolean;
  strValue?: string;
  strValues?: string[]
} 

type det<T> = Omit<T, 'stack' | 'options'> & {
  stack: detToken[];
  options?: detToken[][];  
}

export type detRoot = Root & details
export type detGroup = Group & details & { reference: number }
export type detChar = Char & details
export type detRepitition = Repetition & details
export type detReference = Reference & details
export type detPosition = Position & details
export type detRange = Range & details
export type detSet = {
  type: types.SET,
  set: detToken[],
  minChar: number,
  maxChar: number,
  fixed: boolean,
  not: boolean,
  strValue?: string,
  strValues?: string[]
}

export type detToken = (Exclude<Token, Group> | (Omit<Group, 'stack' | 'options'> & {
  stack: detToken[];
  reference: number;
  options?: detToken[][];  
})) & details

// export type detToken = (Exclude<Token, Group> | det<Group>) & details

export type detTokens = det<Root> | detToken