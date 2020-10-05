import { Tokens } from './tokens'

type details = {
    minChar : number; // Minimum number of characters required to 'satisfy' the regex component
    maxChar : number; // Maximum number of characters required to 'satisfy' the regex component
    regexString: string; // Regular expression (string version) that the token is representing
    regex : RegExp; // Regular expression (Regex Object with flags) that the token is representing
    fixed: boolean; // Whether this token has a 'fixed solution', e.g `(hello)`, or many solutions, e.g. `[0-9]`.
    stringOptions: string[] | undefined; // List of options that satisfy the token
    reference?: number;
    leftEnd: boolean; // Whether the '^' positional is applied or not; 
    rightEnd: boolean; // Whether the '$' positional is applied or not;
  } 

export type detailedTokens = Tokens & details