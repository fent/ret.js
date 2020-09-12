import { types, Root, Token, Tokens, Group } from './types'

const reduceStack = (stack : Token[]): string => stack.map(partialConstruct).join('')

const createAlternate = (token: Root | Group): string => {
  if ('options' in token)
    return token.options?.map(reduceStack).join('|') ?? ''
  else if ('stack' in token)
    return reduceStack(token.stack as Token[])
  else
    throw new Error(`options or stack must be within Root/Group: ${token}`)
}
 

export const reconstruct = (regexpToken : Root): string => partialConstruct(regexpToken)

export const partialConstruct = (token : Tokens): string => {
  switch (token.type) {

    case types.CHAR:
      return String.fromCharCode(token.value)

    case types.RANGE:
      return `${String.fromCharCode(token.from)}-${String.fromCharCode(token.to)}`

    case types.ROOT:
      return createAlternate(token)

    case types.GROUP:
      // Check token.remember
      return `(${token.remember && '?'}${token.lookBehind && '<'}${
        token.followedBy && '='
        || token.notFollowedBy && '!'
        || ':'
        }${createAlternate})`

    case types.POSITION, types.REFERENCE:
      return `\\${token.value}`

    case types.REPETITION: 
      const {min, max} = token
      let endWith;
      switch(`${min}, ${max}`) {
        case '0, 1': endWith = '?';
        case '1, Infinity': endWith = '+';
        case '0, Infinity': endWith = '*';
        default:
          endWith = max === Infinity && `{${min}}(${partialConstruct(token.value)})*`
          || `{${token.min === token.max ? `,${token.max}` : ''}}`
      }
      return `(${partialConstruct(token.value)})${endWith}`

    case types.SET:
      return `[${token.not && '^'}${reduceStack(token.set)}]`
    
    default:
      throw new Error(`Invalid token type: ${token.type}`)
  }
}