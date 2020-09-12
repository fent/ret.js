import { Group, Root, Token } from './tokens'

type details = {
  fixed : boolean;
  minChar : number;
  maxChar : number;
  regexp : string;
}

type det<T> = Omit<T, 'stack' | 'options'> & {
  stack: detToken[];
  options?: detToken[][];  
}

export type detToken = (Exclude<Token, Group> | (Omit<Group, 'stack' | 'options'> & {
  stack: detToken[];
  reference: number;
  options?: detToken[][];  
})) & details

// export type detToken = (Exclude<Token, Group> | det<Group>) & details

export type detTokens = det<Root> | detToken