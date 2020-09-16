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