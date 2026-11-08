import * as React from 'react';
import { Dropdown, IColumn, Text, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildSkillPayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { Skill, SkillCategory, SkillLevel, SkillStatus } from '../../models';
import { generateBusinessId } from '../../rules/ids';
import { certificationAlert, getAllowedSkillStatuses, skillGap, SKILL_LEVELS } from '../../rules/people';
import { validateSkill } from '../../rules/validation';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(SkillStatus);
const CATEGORIES = enumValues(SkillCategory);
const LEVELS = SKILL_LEVELS as string[];

const searchFields = [(s: Skill) => s.title, (s: Skill) => s.personUpn, (s: Skill) => s.skillId, (s: Skill) => s.certification, (s: Skill) => s.notes];
const sortAccessors = {
  skillId: (s: Skill) => s.skillId, title: (s: Skill) => s.title, personUpn: (s: Skill) => s.personUpn, category: (s: Skill) => CATEGORIES.indexOf(s.category),
  level: (s: Skill) => LEVELS.indexOf(s.level), targetLevel: (s: Skill) => LEVELS.indexOf(s.targetLevel), gap: (s: Skill) => skillGap(s),
  certificationExpiry: (s: Skill) => s.certificationExpiry, status: (s: Skill) => s.status
};
const csvColumns = [
  { header: 'Title', value: (s: Skill) => s.title }, { header: 'SkillId', value: (s: Skill) => s.skillId }, { header: 'PersonUPN', value: (s: Skill) => s.personUpn },
  { header: 'Category', value: (s: Skill) => s.category }, { header: 'Level', value: (s: Skill) => s.level }, { header: 'TargetLevel', value: (s: Skill) => s.targetLevel },
  { header: 'Status', value: (s: Skill) => s.status }, { header: 'LastAssessed', value: (s: Skill) => s.lastAssessed },
  { header: 'Certification', value: (s: Skill) => s.certification }, { header: 'CertificationExpiry', value: (s: Skill) => s.certificationExpiry }, { header: 'Notes', value: (s: Skill) => s.notes }
];

const certificationText = (s: Skill): string => {
  if (!s.certification) {
    return '';
  }
  const info = certificationAlert(s);
  const icon = info.alert === 'EXPIRED' ? '🔴 ' : info.alert === 'EXPIRING' ? '🟠 ' : '';
  return `${icon}${s.certification}${s.certificationExpiry ? ` (${s.certificationExpiry})` : ''}`;
};

function makeColumns(t: TranslateFn): IColumn[] {
  return [
    { key: 'skillId', name: t('field.skillId'), fieldName: 'skillId', minWidth: 120 },
    { key: 'title', name: t('field.skill'), fieldName: 'title', minWidth: 160 },
    { key: 'personUpn', name: t('field.person'), fieldName: 'personUpn', minWidth: 150 },
    { key: 'category', name: t('field.category'), minWidth: 90, onRender: (s: Skill) => t(`skillCategory.${s.category}`) },
    { key: 'level', name: t('field.level'), minWidth: 90, onRender: (s: Skill) => t(`skillLevel.${s.level}`) },
    { key: 'targetLevel', name: t('field.targetLevel'), minWidth: 90, onRender: (s: Skill) => t(`skillLevel.${s.targetLevel}`) },
    { key: 'gap', name: t('field.gap'), minWidth: 50, onRender: (s: Skill) => (s.status === SkillStatus.ACTIVE && skillGap(s) > 0 ? `▼ ${skillGap(s)}` : '') },
    { key: 'certificationExpiry', name: t('field.certification'), minWidth: 170, onRender: (s: Skill) => certificationText(s) },
    { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 100 }
  ];
}

const Skills: React.FC = () => {
  const t = useT();
  const { service, userEmail, skills: state } = useHubData();
  const columns = React.useMemo(() => makeColumns(t), [t]);

  const newItem = React.useCallback((): Skill => ({
    skillId: generateBusinessId('SKL'), title: '', personUpn: userEmail, category: SkillCategory.TECHNICAL, level: SkillLevel.BASIC, targetLevel: SkillLevel.INTERMEDIATE,
    status: SkillStatus.ACTIVE, lastAssessed: '', certification: '', certificationExpiry: '', notes: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): Skill => ({
    skillId: row.SkillId || generateBusinessId('SKL'), title: row.Title ?? '', personUpn: row.PersonUPN || userEmail, category: csvEnum(row.Category, CATEGORIES, SkillCategory.OTHER),
    level: csvEnum(row.Level, LEVELS, SkillLevel.BASIC) as SkillLevel, targetLevel: csvEnum(row.TargetLevel, LEVELS, SkillLevel.INTERMEDIATE) as SkillLevel,
    status: csvEnum(row.Status, STATUSES, SkillStatus.ACTIVE), lastAssessed: csvDate(row.LastAssessed), certification: row.Certification ?? '',
    certificationExpiry: csvDate(row.CertificationExpiry), notes: row.Notes ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: Skill, original: Skill | undefined): string | undefined => {
    const base = original ? original.status : SkillStatus.ACTIVE;
    return getAllowedSkillStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<Skill>): React.ReactNode => {
    const base = original ? original.status : SkillStatus.ACTIVE;
    const gap = skillGap(form);
    return (
      <>
        <TextField label={t('field.skillId')} value={form.skillId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, skillId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedSkillStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as SkillStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.skill')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <UserField label={t('field.person')} required service={svc} value={form.personUpn} errorMessage={errors.personUpn && t(errors.personUpn)} onChange={e => setForm(p => ({ ...p, personUpn: e }))} />
        <Dropdown label={t('field.category')} selectedKey={form.category} options={toOptions(CATEGORIES, t, 'skillCategory')} onChange={(_, o) => setForm(p => ({ ...p, category: (o?.key as SkillCategory) ?? SkillCategory.OTHER }))} />
        <Dropdown label={t('field.level')} selectedKey={form.level} options={toOptions(LEVELS, t, 'skillLevel')} onChange={(_, o) => setForm(p => ({ ...p, level: (o?.key as SkillLevel) ?? SkillLevel.BASIC }))} />
        <Dropdown label={t('field.targetLevel')} selectedKey={form.targetLevel} options={toOptions(LEVELS, t, 'skillLevel')} onChange={(_, o) => setForm(p => ({ ...p, targetLevel: (o?.key as SkillLevel) ?? SkillLevel.INTERMEDIATE }))} />
        {gap > 0 && <FormRow full><Text>{t('skills.gapHint', { count: gap })}</Text></FormRow>}
        <DateField label={t('field.lastAssessed')} value={form.lastAssessed} errorMessage={errors.lastAssessed && t(errors.lastAssessed)} onChange={v => setForm(p => ({ ...p, lastAssessed: v }))} />
        <TextField label={t('field.certification')} value={form.certification} onChange={(_, v) => setForm(p => ({ ...p, certification: v ?? '' }))} />
        <DateField label={t('field.certificationExpiry')} value={form.certificationExpiry} errorMessage={errors.certificationExpiry && t(errors.certificationExpiry)} onChange={v => setForm(p => ({ ...p, certificationExpiry: v }))} />
        <FormRow full><TextField label={t('field.notes')} multiline rows={3} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (s: Skill): React.ReactNode => {
    const info = certificationAlert(s);
    const alertText = info.alert === 'NONE' ? '' : ` — ${t(`certAlert.${info.alert}`, { days: Math.abs(info.daysLeft ?? 0) })}`;
    return (
      <DetailFields rows={[
        { label: t('field.skillId'), value: s.skillId },
        { label: t('field.skill'), value: s.title },
        { label: t('field.person'), value: s.personUpn },
        { label: t('field.category'), value: t(`skillCategory.${s.category}`) },
        { label: t('field.level'), value: t(`skillLevel.${s.level}`) },
        { label: t('field.targetLevel'), value: t(`skillLevel.${s.targetLevel}`) },
        { label: t('field.gap'), value: String(skillGap(s)) },
        { label: t('field.status'), value: t(`status.${s.status}`) },
        { label: t('field.lastAssessed'), value: s.lastAssessed },
        { label: t('field.certification'), value: s.certification },
        { label: t('field.certificationExpiry'), value: `${s.certificationExpiry ?? ''}${alertText}`.trim() },
        { label: t('field.notes'), value: s.notes },
        { label: t('common.modifiedBy'), value: `${(s.modified ?? '').slice(0, 10)} ${s.editor ?? ''}`.trim() }
      ]} />
    );
  };

  return (
    <EntityScreen<Skill>
      textKey="skills"
      listName={AppConfig.sharePoint.listNames.teamSkills}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={s => s.status}
      getTitle={s => s.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateSkill}
      buildPayload={buildSkillPayload}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      quickStatuses={s => getAllowedSkillStatuses(s.status)}
      archiveStatus={SkillStatus.ARCHIVED}
      canArchive={s => s.status !== SkillStatus.ARCHIVED}
      csvFileName="skills.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default Skills;
