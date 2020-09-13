import { tokenizer } from './tokenizer'
import { partialConstruct } from './reconstruct'
import { types, Tokens, detToken, Root, detGroup, detChar, detRepitition, Repetition, detReference, detPosition, detRange, Range, Group, detRoot, Set, detSet } from './types'

export const detailTokenizer = (str: string) => addDetail(tokenizer(str))

export const addDetail = (token : Tokens): detToken => {
    let newToken = { ...token, regexp: partialConstruct(token) }
    switch (token.type) {    
        case types.ROOT:
            newToken = addGroupDetails(token, newToken as detRoot);
            return newToken as detToken;
        case types.CHAR:
            (newToken as detChar).minChar = 1;
            (newToken as detChar).maxChar = 1;
            (newToken as detChar).fixed = true;
            return newToken as detToken;
        case types.POSITION:
            (newToken as detPosition).minChar = 0;
            (newToken as detPosition).maxChar = 0;
            (newToken as detPosition).fixed = true;
            return newToken as detToken;
        case types.REFERENCE:
            (newToken as detReference).fixed = true; // Fixed in that it is predetermined by what it is referencing
            return newToken as detToken;
        case types.SET:
            const set = ((token as Set).set as Tokens[]).map(addDetail);
            (newToken as unknown as detSet).minChar = Math.min(...set.map(x => x.minChar) as number[]);
            (newToken as unknown as detSet).maxChar = Math.max(...set.map(x => x.maxChar) as number[]);
            (newToken as unknown as detSet).fixed = set.every(x => x.fixed) as boolean;
            return newToken as detToken;
        case types.RANGE:
            (newToken as detPosition).minChar = 1;
            (newToken as detPosition).maxChar = 1;
            (newToken as detRange).fixed = (token as Range).from === (token as Range).to;
            return newToken as detToken;
        case types.GROUP:
            newToken = addGroupDetails(token as Group, newToken as detGroup)
            return newToken as detToken;
        case types.REPETITION:
            let v = (newToken as detRepitition).value = addDetail((token as Repetition).value);
            (newToken as detRepitition).fixed = v.fixed;
            (newToken as detRepitition).minChar = v.minChar * (v as Repetition).min;
            (newToken as detRepitition).maxChar = v.maxChar * (v as Repetition).max;
            return newToken as detToken;
        default:
            throw new Error('No match')
    }
}

const addGroupDetails = (token: Group | Root, newToken: detGroup | detRoot): detGroup | detRoot => {
    if ((token as Group | Root).options) {
        const options = (token as Group | Root).options?.map(addStackDetail);
        (newToken as detGroup | detRoot).options = options?.map(x => x.stack);
        (newToken as detGroup | detRoot).minChar = Math.min(...options?.map(x => x.minChar) as number[]);
        (newToken as detGroup | detRoot).maxChar = Math.max(...options?.map(x => x.maxChar) as number[]);
        (newToken as detGroup | detRoot).fixed = options?.every(x => x.fixed) as boolean;
    } else if ((token as Group | Root).stack) {
        const {stack, minChar, maxChar, fixed} = addStackDetail((token as Group | Root).stack as Tokens[]);
        (newToken as detGroup | detRoot).stack = stack;
        (newToken as detGroup | detRoot).minChar = minChar;
        (newToken as detGroup | detRoot).maxChar = maxChar;
        (newToken as detGroup | detRoot).fixed = fixed;
    }
    return newToken
}

const addStackDetail = (stack: Tokens[]) => {
    let i = 0
    const v = stack.map(addDetail)
    const minChar = v.reduce((t, x) => t + x.minChar, 0)
    const maxChar = v.reduce((t, x) => t + x.maxChar, 0)
    const fixed = v.every(x => x.fixed)
    for (const element of v) {
        if (element.type === types.GROUP && element.remember)
            (element as detGroup).reference = i++;
    }
    for (const element of v) {
        if (element.type === types.REFERENCE) {
            const refTo = v.find(x => x.type === types.GROUP && x.reference === element.value)
            element.minChar = (refTo as detGroup).minChar
            element.maxChar = (refTo as detGroup).maxChar
            element.fixed = (refTo as detGroup).fixed
        }
    }
    return {
        stack: v,
        minChar,
        maxChar,
        fixed
    }
}