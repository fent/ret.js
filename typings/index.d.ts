declare function ret(input: string): ret.Root;

declare namespace ret {
  enum types {
    ROOT = 0,
    GROUP = 1,
    POSITION = 2,
    SET = 3,
    RANGE = 4,
    REPETITION = 5,
    REFERENCE = 6,
    CHAR = 7
  }

  type Token = Group | Position | Set | Range | Repetition | Reference | Char;
  type Tokens = Root | Token;

  type Root = {
    type: types.ROOT;
    stack?: Token[];
    options?: Token[][];
  };

  type Group = {
    type: types.GROUP;
    remember: boolean;
    stack?: Token[];
    options?: Token[][];
    followedBy?: boolean;
    notFollowedBy?: boolean;
  };

  type Position = {
    type: types.POSITION;
    value: "^" | "$" | "B" | "b";
  };

  type Set = {
    type: types.SET;
    set: (Set | Range | Char)[];
    not: boolean;
  };

  type Range = {
    type: types.RANGE;
    from: number;
    to: number;
  };

  type Repetition = {
    type: types.REPETITION;
    min: number;
    max: number;
    value: Token;
  };

  type Reference = {
    type: types.REFERENCE;
    value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  };

  type Char = {
    type: types.CHAR;
    value: number;
  };
}

export = ret;
