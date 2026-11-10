import assert from 'node:assert/strict';
import { AppConfig } from '../src/config/AppConfig';
import listSchema from '../src/provisioning/listSchema.json';
import { buildFieldXml, IFieldDef, IListDef, newGuid } from '../src/provisioning/fieldXml';
import { ensureLists, findMissingLists, IEnsureProgress, IListProvisioner } from '../src/provisioning/provision';

const defs = listSchema as unknown as IListDef[];

const testXml = (): void => {
  const id = '{11111111-2222-4333-8444-555555555555}';
  assert.equal(buildFieldXml({ name: 'OwnerUPN', type: 'Text' }, id), `<Field Type="Text" ID="${id}" Name="OwnerUPN" StaticName="OwnerUPN" DisplayName="OwnerUPN" MaxLength="255" />`);
  assert.match(buildFieldXml({ name: 'Notes', type: 'Note' }, id), /^<Field Type="Note" .*RichText="FALSE"/);
  assert.match(buildFieldXml({ name: 'DueDate', type: 'Date' }, id), /Type="DateTime".*Format="DateOnly"/);
  assert.match(buildFieldXml({ name: 'Score', type: 'Number', attrs: 'Min="0" Max="10"' }, id), /Name="Score" StaticName="Score" DisplayName="Score" Min="0" Max="10" \/>$/);
  assert.match(buildFieldXml({ name: 'Cost', type: 'Number' }, id), /DisplayName="Cost" \/>$/, 'no stray attribute without extras');
  const choice = buildFieldXml({ name: 'Status', type: 'Choice', choices: ['OPEN', 'IN <&> "X"'] }, id);
  assert.match(choice, /<Default>OPEN<\/Default>/, 'the first choice is the default');
  assert.match(choice, /<CHOICE>IN &lt;&amp;&gt; &quot;X&quot;<\/CHOICE>/, 'values are escaped');
  assert.throws(() => buildFieldXml({ name: 'X', type: 'Bogus' as never }, id));

  const guid = newGuid();
  assert.match(guid, /^\{[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}$/, 'a version 4 GUID in braces');
  assert.notEqual(newGuid(), newGuid());
};

const testSchemaMatchesTheApp = (): void => {
  const names = Object.keys(AppConfig.sharePoint.listNames).map(key => (AppConfig.sharePoint.listNames as unknown as Record<string, string>)[key]);
  assert.deepEqual(defs.map(d => d.title).sort(), names.sort(), 'the schema has exactly the lists the app reads');
  defs.forEach(def => {
    assert.ok(def.description.length > 0, `${def.title} has a description`);
    const fieldNames = def.fields.map(f => f.name);
    assert.equal(new Set(fieldNames).size, fieldNames.length, `${def.title}: column names are unique`);
    fieldNames.forEach(name => assert.match(name, /^[A-Za-z][A-Za-z0-9]*$/, `${def.title}.${name} is a safe internal name`));
    assert.ok(fieldNames.indexOf('Title') === -1, `${def.title}: Title is built in and not redefined`);
    def.fields.filter(f => f.type === 'Choice').forEach(f => assert.ok(f.choices && f.choices.length > 0, `${def.title}.${f.name} has choices`));
    def.fields.forEach(f => assert.ok(buildFieldXml(f).length > 20, `${def.title}.${f.name} builds`));
  });
  const cases = defs.filter(d => d.title === AppConfig.sharePoint.listNames.businessCases)[0];
  assert.ok(cases.fields.some(f => f.name === 'ApprovalRule') && cases.fields.some(f => f.name === 'ApprovalComment'), 'lists with approvals have the approval columns');
};

class FakeSite implements IListProvisioner {
  public lists: Record<string, string[]> = {};
  public log: string[] = [];
  public failOn: string | undefined;
  public async getListTitles(): Promise<string[]> { return Object.keys(this.lists); }
  public async createList(list: IListDef): Promise<void> {
    if (this.failOn === list.title) { throw new Error('Access denied'); }
    this.lists[list.title] = ['Title'];
    this.log.push(`create ${list.title}`);
  }
  public async getFieldNames(title: string): Promise<string[]> { return this.lists[title].slice(); }
  public async addField(title: string, field: IFieldDef): Promise<void> { this.lists[title].push(field.name); this.log.push(`add ${title}.${field.name}`); }
}

const small: IListDef[] = [
  { title: 'A', description: '', fields: [{ name: 'One', type: 'Text' }, { name: 'Two', type: 'Text' }] },
  { title: 'B', description: '', fields: [{ name: 'Three', type: 'Text' }] },
  { title: 'C', description: '', fields: [{ name: 'Four', type: 'Text' }] }
];

const testMissing = (): void => {
  assert.deepEqual(findMissingLists(small, ['A', 'X']).map(d => d.title), ['B', 'C']);
  assert.deepEqual(findMissingLists(small, ['A', 'B', 'C']), []);
  assert.deepEqual(findMissingLists([], ['A']), []);
};

const testEnsure = async (): Promise<void> => {
  // an empty site: everything is created, with every column
  const empty = new FakeSite();
  const progress: IEnsureProgress[] = [];
  const first = await ensureLists(empty, small, { onProgress: p => progress.push(p) });
  assert.deepEqual(first.created, ['A', 'B', 'C']);
  assert.deepEqual(first.failed, []);
  assert.deepEqual(first.fieldsAdded, [], 'columns of a list that was just created are not reported as added');
  assert.deepEqual(empty.lists.A, ['Title', 'One', 'Two']);
  assert.deepEqual(progress.map(p => `${p.done}/${p.total}`), ['1/3', '2/3', '3/3']);

  // running it again changes nothing
  empty.log = [];
  const again = await ensureLists(empty, small);
  assert.deepEqual(again, { created: [], fieldsAdded: [], failed: [] });
  assert.deepEqual(empty.log, [], 'nothing is created or added twice');

  // a site that has some lists, one of them with a column missing: the data lists are kept
  const partial = new FakeSite();
  partial.lists = { A: ['Title', 'One'], B: ['Title', 'Three', 'Extra'] };
  const repaired = await ensureLists(partial, small);
  assert.deepEqual(repaired.created, ['C']);
  assert.deepEqual(repaired.fieldsAdded, [{ list: 'A', fields: ['Two'] }], 'only the missing column of an existing list');
  assert.deepEqual(partial.lists.B, ['Title', 'Three', 'Extra'], 'unknown columns are left alone');

  // only the missing lists: existing ones are not even looked at
  const onlyNew = new FakeSite();
  onlyNew.lists = { A: ['Title'] };
  const created = await ensureLists(onlyNew, small, { onlyMissing: true });
  assert.deepEqual(created.created, ['B', 'C']);
  assert.deepEqual(onlyNew.lists.A, ['Title'], 'an existing list is not repaired in this mode');

  // one failure does not stop the others
  const denied = new FakeSite();
  denied.failOn = 'B';
  const outcome = await ensureLists(denied, small);
  assert.deepEqual(outcome.created, ['A', 'C']);
  assert.deepEqual(outcome.failed, [{ list: 'B', error: 'Access denied' }]);

  // the real schema on an empty site
  const site = new FakeSite();
  const all = await ensureLists(site, defs);
  assert.equal(all.created.length, 38);
  assert.deepEqual(all.failed, []);
  assert.equal(site.lists[AppConfig.sharePoint.listNames.matters].length, 1 + defs.filter(d => d.title === AppConfig.sharePoint.listNames.matters)[0].fields.length);
};

testXml();
testSchemaMatchesTheApp();
testMissing();
testEnsure().then(() => console.log('provisioning tests passed')).catch(error => { console.error(error); process.exit(1); });
