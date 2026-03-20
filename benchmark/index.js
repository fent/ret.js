#!/usr/bin/env node
'use strict';

const { performance } = require('perf_hooks');
const tokenizer = require('../dist');

const reconstruct = tokenizer.reconstruct;

const DEFAULT_MIN_MS = 400;
const DEFAULT_WARMUP_RUNS = 5000;

const CASES = [
  {
    name: 'literal',
    pattern: 'walnuts',
  },
  {
    name: 'alternation',
    pattern: '(?:foo|bar|baz){1,3}(qux|quux)',
  },
  {
    name: 'named-group',
    pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
  },
  {
    name: 'path-like',
    pattern: '^(?:\\/(?:[A-Za-z0-9._~-]|%[0-9A-Fa-f]{2}){1,64}){1,24}\\/?$',
  },
  {
    name: 'email-like',
    pattern: '^(?:[A-Za-z0-9_+.-]{1,64})@(?:[A-Za-z0-9-]{1,63}\\.){1,8}[A-Za-z]{2,24}$',
  },
  {
    name: 'class-heavy',
    pattern: '^(?:[A-Za-z0-9_./-]{3,32}|\\[(?:\\d{1,3}\\.){3}\\d{1,3}\\])(?:,(?:[A-Za-z0-9_./-]{3,32}|\\[(?:\\d{1,3}\\.){3}\\d{1,3}\\])){0,50}$',
  },
  {
    name: 'dense-sets',
    pattern: '^(?:[\\w.-]{1,16}:[^\\s\\]]{1,32};?){1,40}$',
  },
  {
    name: 'backrefs',
    pattern: '<(\\w+)>(?:[^<]|<(?!\\/\\1>))*<\\/\\1>',
  },
];

const SUITE_NAMES = ['tokenizer', 'reconstruct', 'roundtrip'];

const parseArgs = (argv) => {
  const options = {
    minMs: DEFAULT_MIN_MS,
    warmupRuns: DEFAULT_WARMUP_RUNS,
    suite: 'all',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--min-ms':
        options.minMs = parsePositiveInt(argv[++i], '--min-ms');
        break;

      case '--warmup-runs':
        options.warmupRuns = parsePositiveInt(argv[++i], '--warmup-runs');
        break;

      case '--suite':
        options.suite = argv[++i];
        if (options.suite !== 'all' && !SUITE_NAMES.includes(options.suite)) {
          throw new Error(`Unknown suite '${options.suite}'`);
        }
        break;

      case '--help':
        printHelp();
        process.exit(0);
        break;

      default:
        throw new Error(`Unknown argument '${arg}'`);
    }
  }

  return options;
};

const parsePositiveInt = (value, flagName) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return parsed;
};

const printHelp = () => {
  console.log('Usage: node benchmark/index.js [--suite <name>] [--min-ms <ms>] [--warmup-runs <count>]');
  console.log('');
  console.log('Suites: all, tokenizer, reconstruct, roundtrip');
};

const benchmark = (fn, input, minMs, warmupRuns) => {
  for (let i = 0; i < warmupRuns; i++) {
    fn(input);
  }

  let iterations = 0;
  let elapsedMs = 0;
  const start = performance.now();

  // Sample elapsed time periodically so the timer itself does not dominate fast cases.
  do {
    fn(input);
    iterations++;
    if ((iterations & 0x3ff) === 0) {
      elapsedMs = performance.now() - start;
    }
  } while (elapsedMs < minMs);

  const totalMs = performance.now() - start;
  return {
    iterations,
    ms: totalMs,
    opsPerSec: iterations / (totalMs / 1000),
  };
};

const formatNumber = (value, fractionDigits) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const truncate = (pattern, maxLength) =>
  pattern.length <= maxLength ? pattern : `${pattern.slice(0, maxLength - 3)}...`;

const printSuite = (name, rows) => {
  console.log(`${name}:`);
  console.log('case'.padEnd(16) + 'len'.padStart(6) + 'ops/s'.padStart(15) + 'iterations'.padStart(14) + '  sample');

  for (const row of rows) {
    console.log(
      row.name.padEnd(16) +
      String(row.length).padStart(6) +
      formatNumber(row.opsPerSec, 2).padStart(15) +
      formatNumber(row.iterations, 0).padStart(14) +
      `  ${truncate(row.label, 72)}`,
    );
  }

  const averageOpsPerSec = rows.reduce((sum, row) => sum + row.opsPerSec, 0) / rows.length;
  console.log(`average ops/s: ${formatNumber(averageOpsPerSec, 2)}`);
  console.log('');
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));

  // Reconstruct benchmarks reuse one token tree per pattern so they measure the
  // serializer itself instead of folding tokenizer time back into the result.
  const tokenCases = CASES.map(({ name, pattern }) => ({
    name,
    label: pattern,
    length: pattern.length,
    input: tokenizer(pattern),
  }));

  const suites = {
    tokenizer: {
      cases: CASES.map(({ name, pattern }) => ({
        name,
        label: pattern,
        length: pattern.length,
        input: pattern,
      })),
      fn: tokenizer,
    },
    reconstruct: {
      cases: tokenCases,
      fn: reconstruct,
    },
    roundtrip: {
      cases: CASES.map(({ name, pattern }) => ({
        name,
        label: pattern,
        length: pattern.length,
        input: pattern,
      })),
      fn: (pattern) => reconstruct(tokenizer(pattern)),
    },
  };

  const suiteNames = options.suite === 'all' ? SUITE_NAMES : [options.suite];

  for (const suiteName of suiteNames) {
    const suite = suites[suiteName];
    const rows = suite.cases.map((testCase) => {
      const result = benchmark(suite.fn, testCase.input, options.minMs, options.warmupRuns);
      return {
        name: testCase.name,
        label: testCase.label,
        length: testCase.length,
        opsPerSec: result.opsPerSec,
        iterations: result.iterations,
      };
    });

    printSuite(suiteName, rows);
  }
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
