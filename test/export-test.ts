import assert from 'node:assert';
import ret, { reconstruct, types } from '..';

describe('Exports', () => {
  it('Exposes tokenizer and named helpers', () => {
    assert.strictEqual(typeof ret, 'function');
    assert.strictEqual(ret.types, types);
    assert.strictEqual(ret.reconstruct, reconstruct);
  });
});
