import { Tokens } from './tokens'

type details = {
  minChar : number;
  maxChar : number;
  regexString: string;
  regex : RegExp;
  fixed: boolean;
  stringOptions: string[] | undefined;
  reference?: number;
  leftEnd: boolean;
  rightEnd: boolean;
} 

export type detailedTokens = Tokens & details




// type det<T> = Omit<T, 'stack' | 'options'> & {
//   stack: detToken[];
//   options?: detToken[][];  
// }

// export type detRoot = Root & details
// export type detGroup = Group & details & { reference: number }
// export type detChar = Char & details
// export type detRepitition = Repetition & details
// export type detReference = Reference & details
// export type detPosition = Position & details
// export type detRange = Range & details
// export type detSet = {
//   type: types.SET,
//   set: detToken[],
//   minChar: number,
//   maxChar: number,
//   fixed: boolean,
//   not: boolean,
//   strValues: string[]
// }

// export type detToken = ((Exclude<Token, Group> | (Omit<Group, 'stack' | 'options'> & {
//   stack: detToken[];
//   reference: number;
//   options?: detToken[][];  
// })) & details) | detRoot

// // export type detToken = (Exclude<Token, Group> | det<Group>) & details

// export type detTokens = det<Root> | detToken