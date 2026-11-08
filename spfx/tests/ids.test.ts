import assert from 'node:assert/strict';
import { generateBusinessId } from '../src/rules/ids';

const testFormat = (): void => {
  const id = generateBusinessId('IDEA', new Date(2026, 10, 8), () => 0);
  assert.equal(id, 'IDEA-20261108-000000');
  assert.match(generateBusinessId('ACT'), /^ACT-\d{8}-[0-9A-Z]{6}$/);
};

const testSuffixUsesTheRandomSource = (): void => {
  const values = [0, 0.5, 0.999999, 0.25, 0.75, 0.1];
  let index = 0;
  const id = generateBusinessId('P', new Date(2025, 0, 2), () => values[index++]);
  // 0 -> '0', 0.5 -> 'I' (index 18), 0.999999 -> 'Z' (index 35), 0.25 -> '9', 0.75 -> 'R', 0.1 -> '3'
  assert.equal(id, 'P-20250102-0IZ9R3');
};

const testTwoIdsInTheSameInstantDiffer = (): void => {
  const now = new Date(2026, 10, 8, 12, 0, 0, 0);
  const seen: Record<string, boolean> = {};
  let duplicates = 0;
  for (let i = 0; i < 300; i++) {
    const id = generateBusinessId('INIT', now);
    if (seen[id]) {
      duplicates++;
    }
    seen[id] = true;
  }

  // 36^6 combinations (about 2 billion): a bare Date.now() would give 300 identical ids here.
  assert.equal(duplicates, 0, `Expected no duplicate ids within the same millisecond, got ${duplicates}`);
};

testFormat();
testSuffixUsesTheRandomSource();
testTwoIdsInTheSameInstantDiffer();
console.log('ids tests passed');
