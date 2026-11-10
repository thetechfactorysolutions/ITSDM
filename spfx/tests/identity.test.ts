import assert from 'node:assert/strict';
import { AppConfig } from '../src/config/AppConfig';
import { gradientOf, identityForList, identityForTab, TAB_IDENTITY } from '../src/config/identity';
import { TABS } from '../src/config/navMap';

// every tab and every list has its own look
TABS.forEach(([key]) => assert.ok(TAB_IDENTITY[key], `the tab ${key} has an identity`));
const names = Object.values(AppConfig.sharePoint.listNames) as string[];
assert.equal(names.length, 39);
const emojis = new Set<string>();
names.forEach(name => {
  const id = identityForList(name);
  assert.notEqual(id.emoji, '📋', `${name} has its own emoji`);
  assert.ok(/^#[0-9a-f]{6}$/i.test(id.from) && /^#[0-9a-f]{6}$/i.test(id.to), `${name} has colours`);
  emojis.add(id.emoji);
});
assert.ok(emojis.size >= 30, 'the lists are told apart by their emoji');

assert.equal(identityForList('Whatever').emoji, '📋', 'unknown lists still get a look');
assert.equal(identityForTab('nope').emoji, '📋');
assert.ok(gradientOf(identityForTab('actions')).startsWith('linear-gradient('));

console.log('identity tests passed');
