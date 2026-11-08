import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { resolveLanguage, translate } from '../src/i18n/I18n';
import { ActionPriority, ActionStatus, IdeaStatus, InitiativeStatus, NoteCategory, NoteStatus, ProjectRiskLevel, ProjectStatus } from '../src/models';

const placeholders = (text: string): string[] => (text.match(/\{\w+\}/g) ?? []).sort();

const testSameKeys = (): void => {
  const enKeys = Object.keys(en).sort();
  const esKeys = Object.keys(es).sort();
  assert.deepEqual(esKeys.filter(k => enKeys.indexOf(k) === -1), [], 'keys only in Spanish');
  assert.deepEqual(enKeys.filter(k => esKeys.indexOf(k) === -1), [], 'keys only in English');
};

const testNoEmptyAndSamePlaceholders = (): void => {
  for (const key of Object.keys(en)) {
    assert.ok(en[key].trim().length > 0, `en.${key} is empty`);
    assert.ok(es[key].trim().length > 0, `es.${key} is empty`);
    assert.deepEqual(placeholders(es[key]), placeholders(en[key]), `${key}: the {placeholders} differ between languages`);
  }
};

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));

/** Every text key written in the source must exist, so a typo shows as a test failure, not as a raw key on screen. */
const testEveryKeyUsedInCodeExists = (): void => {
  const files = walk(path.join(__dirname, '..', 'src')).filter(f => /\.(ts|tsx)$/.test(f) && !/i18n[\\/](en|es)\.ts$/.test(f));
  const used = new Set<string>();
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const m of source.matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(m[1]);
    for (const m of source.matchAll(/'((?:validation|import)\.[\w.]+)'/g)) used.add(m[1]);
    for (const m of source.matchAll(/textKey="(\w+)"/g)) ['title', 'new', 'edit', 'create', 'empty'].forEach(k => used.add(`${m[1]}.${k}`));
  }

  assert.ok(used.size > 150, `expected to find many keys, found ${used.size}`);
  const missing = Array.from(used).filter(key => !(key in en));
  assert.deepEqual(missing, [], 'keys used in the code but missing from the dictionaries');
};

/** Keys built at run time (status.X, priority.X...) are checked against the real lists of values. */
const testDynamicKeys = (): void => {
  const values = (e: Record<string, string>): string[] => Object.keys(e).map(k => e[k]);
  const groups: Array<[string, string[]]> = [
    ['status', [...values(IdeaStatus), ...values(InitiativeStatus), ...values(ProjectStatus), ...values(ActionStatus), ...values(NoteStatus)]],
    ['priority', values(ActionPriority)],
    ['risk', values(ProjectRiskLevel)],
    ['category', values(NoteCategory)]
  ];
  for (const [prefix, list] of groups) {
    for (const value of list) {
      assert.ok(`${prefix}.${value}` in en, `missing ${prefix}.${value}`);
    }
  }
  for (const field of ['meeting.date', 'targetDate', 'startDate', 'endDate', 'dueDate', 'riskLevel', 'priority', 'category']) {
    assert.ok(`importField.${field}` in en, `missing importField.${field}`);
  }
  for (const kind of ['initiatives', 'projects', 'ideas', 'actions', 'notes', 'meetings']) {
    assert.ok(`nav.${kind}` in en, `missing nav.${kind}`);
  }
  for (const kind of ['initiative', 'project']) {
    assert.ok(`field.${kind}` in en, `missing field.${kind}`);
  }
};

const testTranslate = (): void => {
  assert.equal(translate('en', 'common.save'), 'Save');
  assert.equal(translate('es', 'common.save'), 'Guardar');
  assert.equal(translate('en', 'csv.line', { line: 7 }), 'Row 7');
  assert.equal(translate('es', 'csv.line', { line: 7 }), 'Fila 7');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key', 'an unknown key shows itself rather than blank');
  assert.equal(translate('en', 'csv.line'), 'Row {line}', 'a missing parameter leaves the placeholder visible');
  assert.equal(translate('es', 'import.sourceTag', { id: 'MEET-1' }), '[Origen: MEET-1]');
};

const testResolveLanguage = (): void => {
  assert.equal(resolveLanguage('es', 'en-US'), 'es', 'an explicit setting wins');
  assert.equal(resolveLanguage('en', 'es-ES'), 'en');
  assert.equal(resolveLanguage('auto', 'es-ES'), 'es');
  assert.equal(resolveLanguage('auto', 'es-MX'), 'es');
  assert.equal(resolveLanguage('auto', 'en-GB'), 'en');
  assert.equal(resolveLanguage('auto', 'fr-FR'), 'en', 'unsupported languages fall back to English');
  assert.equal(resolveLanguage(undefined, undefined), 'en');
};

testSameKeys();
testNoEmptyAndSamePlaceholders();
testEveryKeyUsedInCodeExists();
testDynamicKeys();
testTranslate();
testResolveLanguage();
console.log('i18n tests passed');
