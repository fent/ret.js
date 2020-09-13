import { regexTokenizer, tokenizer } from './tokenizer'
import { partialConstruct } from './reconstruct'
import { types, Tokens, detToken, Root, detGroup, detChar, detRepitition, Repetition, detReference, detPosition, detRange, Range, Group, detRoot, Set, detSet, Position } from './types'
import * as R from 'ramda'

export const regexDetailTokenizer = (regex: RegExp) => addDetail(regexTokenizer(regex))

export const detailTokenizer = (str: string) => addDetail(tokenizer(str))

const extract = ({strValue, strValues}: {strValue?: string, strValues?: string[]}): string[] | undefined => {
    if (strValue !== undefined)
        return [strValue];
    else if (strValues)
        return strValues
    else
        return undefined
}

export const addDetail = (token : Tokens & { flags?: string[] }, flags: string[] = (token.flags ??= [])): detToken => {
    const regexpstr = partialConstruct(token)
    let newToken = { 
        ...token, 
        regexpstr: partialConstruct(token),
        regexp: new RegExp(regexpstr, flags.join(''))
    }
    switch (token.type) {    
        case types.ROOT:
            newToken = addGroupDetails(token, newToken as detRoot, flags);
            const fixedStack = newToken.stack
            // Handling of this particular part needs to be better
            if (!(fixedStack // Checking to make sure the expression is fixed on both sides
                && fixedStack[0].type === types.POSITION 
                && fixedStack[0].value === '^'
                && R.last(fixedStack)?.type === types.POSITION
                && (R.last(fixedStack) as Position)?.value === '$'
                )) {
                (newToken as detRoot).strValues = undefined;
                (newToken as detRoot).strValue = undefined;
                (newToken as detRoot).fixed = false;
                (newToken as detRoot).maxChar = Infinity;
            }
            return newToken as detToken;
        case types.CHAR:
            (newToken as detChar).minChar = 1;
            (newToken as detChar).maxChar = 1;
            (newToken as detChar).fixed = true;
            (newToken as detChar).strValue = String.fromCharCode(token.value);
            return newToken as detToken;
        case types.POSITION:
            (newToken as detPosition).minChar = 0;
            (newToken as detPosition).maxChar = 0;
            (newToken as detPosition).fixed = true;
            (newToken as detPosition).strValue = '';
            return newToken as detToken;
        case types.REFERENCE:
            (newToken as detReference).fixed = true; // Fixed in that it is predetermined by what it is referencing
            return newToken as detToken;
        case types.SET:
            const set = ((token as Set).set as Tokens[]).map(x => addDetail(x, flags));
            const opts: (string[] | undefined)[] = set.map(extract);
            let allOpts: string[] | undefined = [];
            if (opts.some(x => x === undefined)) {
                allOpts = undefined
            } else {
                for (const o of opts) {
                    if (o !== undefined && allOpts !== undefined) {
                        allOpts = [...o, ...allOpts]
                    }
                }
            }
            (newToken as unknown as detSet).minChar = Math.min(...set.map(x => x.minChar) as number[]);
            (newToken as unknown as detSet).maxChar = Math.max(...set.map(x => x.maxChar) as number[]);
            const fix = (newToken as unknown as detSet).fixed = set.every(x => x.fixed) as boolean || allOpts?.length === 1;
            (newToken as unknown as detSet).strValue = fix && allOpts?.length === 1 ? allOpts[0] : undefined;
            (newToken as unknown as detSet).strValues = !fix ? allOpts : undefined;
            (newToken as unknown as detSet).set = set;

            return newToken as detToken;
        case types.RANGE:
            (newToken as detPosition).minChar = 1;
            (newToken as detPosition).maxChar = 1;
            let values: string[] = []
            for (let i = (token as Range).from; i <= (token as Range).to; i++) {
                values.push(String.fromCharCode(i))
            }
            if ('i' in flags)
                values = [ ...values.map(x => x.toUpperCase()), ...values.map(x => x.toLowerCase()) ];
            values = R.uniq(values).sort();
            const fixed = (newToken as detRange).fixed = values.length === 1
            if (fixed)
                (newToken as detRange).strValue = values[0];
            else
                (newToken as detRange).strValues = values;
            
            // Fix
            return newToken as detToken;
        case types.GROUP:
            newToken = addGroupDetails(token as Group, newToken as detGroup, flags)
            return newToken as detToken;
        case types.REPETITION:
            let v = (newToken as detRepitition).value = addDetail((token as Repetition).value, flags);
            const vls: string[] | undefined = extract(v);
            let allVls: string[] = [];
            
            (newToken as detRepitition).minChar = v.minChar * (token as Repetition).min;
            (newToken as detRepitition).maxChar = v.maxChar * (token as Repetition).max;
            

            if ((token as Repetition).max !== Infinity && vls) {
                for (let i = (token as Repetition).min; i <= (token as Repetition).max; i++)
                    allVls = allVls.concat(...vls.map(x => x.repeat(i)))
            }
            
            const newVls = R.uniq(allVls).sort()


            if ((newToken as detRepitition).fixed)
                (newToken as detRepitition).strValue = newVls[0];
            else
                (newToken as detRepitition).strValues = newVls;

            (newToken as detRepitition).fixed = 
                v.fixed && (token as Repetition).min === (token as Repetition).max
                || newVls?.length === 1;
            return newToken as detToken;
        default:
            throw new Error('No match')
    }
}

const setOrOptions = (token: Group | Root, newToken: detGroup | detRoot, flags: string[]) => {
    const options = (token as Group | Root).options?.map(x => addStackDetail(x, flags));
    const vals: string[] | undefined = options?.reduce((t: string[] | undefined, v) => {
        const vls: string[] | undefined = extract(v);
        return t && vls ? [ ...t, ...vls ] : undefined
    }, []);        
    (newToken as detGroup | detRoot).options = options?.map(x => x.stack);
    (newToken as detGroup | detRoot).minChar = Math.min(...options?.map(x => x.minChar) as number[]);
    (newToken as detGroup | detRoot).maxChar = Math.max(...options?.map(x => x.maxChar) as number[]);
    const fixed = (newToken as detGroup | detRoot).fixed = 
        (options?.every(x => x.fixed) as boolean && (options?.length as number) < 2)
        || vals?.length === 1;
    (newToken as detGroup | detRoot).strValue = fixed && vals?.length == 1 ? vals[0] : undefined;
    (newToken as detGroup | detRoot).strValues = vals && vals?.length != 1 ? vals : undefined;
    return newToken
}

const addGroupDetails = (token: Group | Root, newToken: detGroup | detRoot, flags: string[]): detGroup | detRoot => {
    if ((token as Group | Root).options) {
        newToken = setOrOptions(token, newToken, flags)
    } else if ((token as Group | Root).stack) {
        const {stack, minChar, maxChar, fixed, strValue, strValues} = addStackDetail((token as Group | Root).stack as Tokens[], flags);
        (newToken as detGroup | detRoot).stack = stack;
        (newToken as detGroup | detRoot).minChar = minChar;
        (newToken as detGroup | detRoot).maxChar = maxChar;
        (newToken as detGroup | detRoot).fixed = fixed;
        (newToken as detGroup | detRoot).strValue = strValue;
        (newToken as detGroup | detRoot).strValues = strValues;
    }
    return newToken
}

const addStackDetail = (stack: Tokens[], flags: string[]) => {
    let i = 0
    const v = stack.map(x => addDetail(x, flags))
    const minChar = v.reduce((t, x) => t + x.minChar, 0)
    const maxChar = v.reduce((t, x) => t + x.maxChar, 0)
    //const fixed = v.every(x => x.fixed)
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
            element.strValue = (refTo as detGroup).strValue
            element.strValues = (refTo as detGroup).strValues
        }
    }
    let prod: string[] | undefined = ['']
    for (const token of v) {
        const t = extract(token)
        if (t && prod) {
            prod = R.uniq(R.xprod(prod, t).map(([l, r]) => l + r)).sort()
        }
        else {
            prod = undefined
        }
    }
    let fixed = prod?.length === 1
    const strValue = (fixed && prod) ? prod[0] : undefined
    const strValues = (!fixed && prod) ? prod : undefined

    return {
        stack: v,
        minChar,
        maxChar,
        fixed,
        strValue,
        strValues
    }
}