export const WORDS = (): Record<string | number, boolean> => ({
  95: true,
  '97-122': true,
  '65-90': true,
  '48-57': true,
});

export const WHITESPACE = (): Record<string | number, boolean> => ({
  9: true,
  10: true,
  11: true,
  12: true,
  13: true,
  32: true,
  160: true,
  5760: true,
  '8192-8202': true,
  8232: true,
  8233: true,
  8239: true,
  8287: true,
  12288: true,
  65279: true,
});

export const NOTANYCHAR = (): Record<string | number, boolean> => ({
  10: true,
  13: true,
  8232: true,
  8233: true,
});
