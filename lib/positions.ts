import { types } from './types';

export const wordBoundary = () => ({ type: types.POSITION, value: 'b' });
export const nonWordBoundary = () => ({ type: types.POSITION, value: 'B' });
export const begin = () => ({ type: types.POSITION, value: '^' });
export const end = () => ({ type: types.POSITION, value: '$' });
