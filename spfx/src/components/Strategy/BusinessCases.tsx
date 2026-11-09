import * as React from 'react';
import { Dropdown, IColumn, Stack, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvDate, csvEnum, csvNumber, enumValues } from '../../entities/csvHelpers';
import { buildCasePayload } from '../../entities/payloads';
import { TranslateFn, useT } from '../../i18n/I18n';
import { BusinessCase, CaseStatus } from '../../models';
import { dayKeyToSharePoint } from '../../rules/dates';
import { generateBusinessId } from '../../rules/ids';
import { applyCaseEffects, casePaybackMonths, caseRoiPct, getAllowedCaseStatuses } from '../../rules/strategy';
import { validateCase } from '../../rules/validation';
import { formatMoney } from '../../utils/format';
import { titleFor, titleMap } from '../../utils/lookup';
import DateField from '../shared/DateField';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IApprovalConfig, IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import LinkField from '../shared/LinkField';
import { useStrategyLinkOptions } from '../shared/linkOptions';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';

const STATUSES = enumValues(CaseStatus);

/** Connects this screen to the approval rules in src/rules/approvals.ts. */
const approvalConfig: IApprovalConfig<BusinessCase> = {
  entity: 'cases',
  getBusinessId: item => item.caseId,
  proposeStatus: (item, status) => ({ ...item, status: status as CaseStatus })
};

const searchFields = [(c: BusinessCase) => c.title, (c: BusinessCase) => c.problem, (c: BusinessCase) => c.recommendation, (c: BusinessCase) => c.caseId, (c: BusinessCase) => c.ownerUpn];
const sortAccessors = {
  title: (c: BusinessCase) => c.title, status: (c: BusinessCase) => c.status, estimatedCost: (c: BusinessCase) => c.estimatedCost, annualBenefit: (c: BusinessCase) => c.annualBenefit,
  roi: (c: BusinessCase) => caseRoiPct(c), decisionDate: (c: BusinessCase) => c.decisionDate
};
const csvColumns = [
  { header: 'Title', value: (c: BusinessCase) => c.title }, { header: 'CaseId', value: (c: BusinessCase) => c.caseId }, { header: 'Problem', value: (c: BusinessCase) => c.problem },
  { header: 'Options', value: (c: BusinessCase) => c.options }, { header: 'Recommendation', value: (c: BusinessCase) => c.recommendation }, { header: 'Risks', value: (c: BusinessCase) => c.risks },
  { header: 'EstimatedCost', value: (c: BusinessCase) => c.estimatedCost }, { header: 'AnnualBenefit', value: (c: BusinessCase) => c.annualBenefit }, { header: 'ObjectiveId', value: (c: BusinessCase) => c.objectiveId },
  { header: 'InitiativeId', value: (c: BusinessCase) => c.initiativeId }, { header: 'ProjectId', value: (c: BusinessCase) => c.projectId }, { header: 'OwnerUPN', value: (c: BusinessCase) => c.ownerUpn },
  { header: 'Status', value: (c: BusinessCase) => c.status }, { header: 'DecisionDate', value: (c: BusinessCase) => c.decisionDate }, { header: 'DecisionNotes', value: (c: BusinessCase) => c.decisionNotes }
];

const roiText = (roi: number | undefined): string => (roi === undefined ? '—' : `${roi} %`);

const makeColumns = (t: TranslateFn): IColumn[] => [
  { key: 'title', name: t('field.title'), fieldName: 'title', minWidth: 240 },
  { key: 'status', name: t('field.status'), fieldName: 'status', minWidth: 120 },
  { key: 'estimatedCost', name: t('field.estimatedCost'), minWidth: 100, onRender: (c: BusinessCase) => formatMoney(c.estimatedCost) },
  { key: 'annualBenefit', name: t('field.annualBenefit'), minWidth: 100, onRender: (c: BusinessCase) => formatMoney(c.annualBenefit) },
  { key: 'roi', name: t('case.roi'), minWidth: 70, onRender: (c: BusinessCase) => roiText(caseRoiPct(c)) },
  { key: 'ownerUpn', name: t('field.owner'), fieldName: 'ownerUpn', minWidth: 150 }
];

/** The reasoning behind an investment, with its return and the decision taken. */
const BusinessCases: React.FC = () => {
  const t = useT();
  const { service, userEmail, businessCases: state, objectives, initiatives, projects } = useHubData();
  const { objectiveOptions, initiativeOptions, projectOptions } = useStrategyLinkOptions();
  const columns = React.useMemo(() => makeColumns(t), [t]);
  const objectiveTitles = React.useMemo(() => titleMap(objectives.items, o => o.objectiveId), [objectives.items]);
  const initiativeTitles = React.useMemo(() => titleMap(initiatives.items, i => i.initiativeId), [initiatives.items]);
  const projectTitles = React.useMemo(() => titleMap(projects.items, p => p.projectId), [projects.items]);

  const newItem = React.useCallback((): BusinessCase => ({
    caseId: generateBusinessId('CASE'), title: '', problem: '', options: '', recommendation: '', risks: '', estimatedCost: 0, annualBenefit: 0, objectiveId: '', initiativeId: '', projectId: '',
    ownerUpn: userEmail, status: CaseStatus.DRAFT, decisionDate: '', decisionNotes: ''
  }), [userEmail]);

  const csvFromRow = React.useCallback((row: Record<string, string>): BusinessCase => ({
    caseId: row.CaseId || generateBusinessId('CASE'), title: row.Title ?? '', problem: row.Problem ?? '', options: row.Options ?? '', recommendation: row.Recommendation ?? '', risks: row.Risks ?? '',
    estimatedCost: csvNumber(row.EstimatedCost), annualBenefit: csvNumber(row.AnnualBenefit), objectiveId: row.ObjectiveId ?? '', initiativeId: row.InitiativeId ?? '', projectId: row.ProjectId ?? '',
    ownerUpn: row.OwnerUPN || userEmail, status: csvEnum(row.Status, STATUSES, CaseStatus.DRAFT), decisionDate: csvDate(row.DecisionDate), decisionNotes: row.DecisionNotes ?? ''
  }), [userEmail]);

  const checkBeforeSave = (form: BusinessCase, original: BusinessCase | undefined): string | undefined => {
    const base = original ? original.status : CaseStatus.DRAFT;
    return getAllowedCaseStatuses(base).indexOf(form.status) === -1
      ? t('common.invalidTransition', { from: t(`status.${base}`), to: t(`status.${form.status}`) })
      : undefined;
  };

  const renderForm = ({ form, setForm, errors, original, isEdit, service: svc }: IFormContext<BusinessCase>): React.ReactNode => {
    const base = original ? original.status : CaseStatus.DRAFT;
    const roi = caseRoiPct(form);
    const payback = casePaybackMonths(form);
    return (
      <>
        <TextField label={t('field.caseId')} value={form.caseId} readOnly={isEdit} onChange={(_, v) => setForm(p => ({ ...p, caseId: v ?? '' }))} />
        <Dropdown label={t('field.status')} selectedKey={form.status} options={toOptions(getAllowedCaseStatuses(base), t)} onChange={(_, o) => setForm(p => ({ ...p, status: (o?.key as CaseStatus) ?? base }))} />
        <FormRow full><TextField label={t('field.title')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.problem')} multiline rows={3} value={form.problem} onChange={(_, v) => setForm(p => ({ ...p, problem: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.options')} multiline rows={3} value={form.options} onChange={(_, v) => setForm(p => ({ ...p, options: v ?? '' }))} /></FormRow>
        <FormRow full><TextField label={t('field.recommendation')} multiline rows={3} value={form.recommendation} onChange={(_, v) => setForm(p => ({ ...p, recommendation: v ?? '' }))} /></FormRow>
        <TextField label={t('field.estimatedCost')} type="number" min={0} value={String(form.estimatedCost)} errorMessage={errors.estimatedCost && t(errors.estimatedCost)} onChange={(_, v) => setForm(p => ({ ...p, estimatedCost: v === undefined || v === '' ? 0 : Number(v) }))} />
        <TextField label={t('field.annualBenefit')} type="number" min={0} value={String(form.annualBenefit)} errorMessage={errors.annualBenefit && t(errors.annualBenefit)} onChange={(_, v) => setForm(p => ({ ...p, annualBenefit: v === undefined || v === '' ? 0 : Number(v) }))} />
        <FormRow full><span aria-live="polite">{t('case.returnSummary', { roi: roiText(roi), payback: payback === undefined ? '—' : `${payback}` })}</span></FormRow>
        <FormRow full><TextField label={t('field.risks')} multiline rows={2} value={form.risks} onChange={(_, v) => setForm(p => ({ ...p, risks: v ?? '' }))} /></FormRow>
        <LinkField label={t('field.objective')} value={form.objectiveId} options={objectiveOptions} onChange={id => setForm(p => ({ ...p, objectiveId: id }))} />
        <LinkField label={t('field.initiative')} value={form.initiativeId} options={initiativeOptions} onChange={id => setForm(p => ({ ...p, initiativeId: id }))} />
        <LinkField label={t('field.project')} value={form.projectId} options={projectOptions} onChange={id => setForm(p => ({ ...p, projectId: id }))} />
        <UserField label={t('field.owner')} required service={svc} value={form.ownerUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, ownerUpn: e }))} />
        <DateField label={t('field.decisionDate')} value={form.decisionDate} errorMessage={errors.decisionDate && t(errors.decisionDate)} onChange={v => setForm(p => ({ ...p, decisionDate: v }))} />
        <FormRow full><TextField label={t('field.decisionNotes')} multiline rows={2} value={form.decisionNotes} onChange={(_, v) => setForm(p => ({ ...p, decisionNotes: v ?? '' }))} /></FormRow>
      </>
    );
  };

  const renderDetail = (c: BusinessCase): React.ReactNode => (
    <Stack tokens={{ childrenGap: 16 }}>
      <DetailFields rows={[
        { label: t('field.caseId'), value: c.caseId },
        { label: t('field.status'), value: t(`status.${c.status}`) },
        { label: t('field.problem'), value: c.problem },
        { label: t('field.options'), value: c.options },
        { label: t('field.recommendation'), value: c.recommendation },
        { label: t('field.risks'), value: c.risks },
        { label: t('field.estimatedCost'), value: formatMoney(c.estimatedCost) },
        { label: t('field.annualBenefit'), value: formatMoney(c.annualBenefit) },
        { label: t('case.roi'), value: roiText(caseRoiPct(c)) },
        { label: t('case.payback'), value: casePaybackMonths(c) === undefined ? '—' : t('case.months', { months: casePaybackMonths(c) as number }) },
        { label: t('field.objective'), value: c.objectiveId ? `${titleFor(objectiveTitles, c.objectiveId)} (${c.objectiveId})` : '' },
        { label: t('field.initiative'), value: c.initiativeId ? `${titleFor(initiativeTitles, c.initiativeId)} (${c.initiativeId})` : '' },
        { label: t('field.project'), value: c.projectId ? `${titleFor(projectTitles, c.projectId)} (${c.projectId})` : '' },
        { label: t('field.owner'), value: c.ownerUpn },
        { label: t('field.decisionDate'), value: c.decisionDate },
        { label: t('field.decisionNotes'), value: c.decisionNotes },
        { label: t('common.modifiedBy'), value: `${(c.modified ?? '').slice(0, 10)} ${c.editor ?? ''}`.trim() }
      ]} />
    </Stack>
  );

  return (
    <EntityScreen<BusinessCase>
      textKey="cases"
      listName={AppConfig.sharePoint.listNames.businessCases}
      state={state}
      service={service}
      statuses={STATUSES}
      getStatus={c => c.status}
      getTitle={c => c.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validateCase}
      buildPayload={buildCasePayload}
      prepareForSave={form => applyCaseEffects(form)}
      checkBeforeSave={checkBeforeSave}
      renderForm={renderForm}
      renderDetail={renderDetail}
      approval={approvalConfig}
      quickStatuses={c => getAllowedCaseStatuses(c.status)}
      quickPayload={(item, status) => {
        const updated = applyCaseEffects({ ...item, status: status as CaseStatus });
        return { Status: status, DecisionDate: dayKeyToSharePoint(updated.decisionDate) };
      }}
      hideArchive
      archiveStatus={CaseStatus.ARCHIVED}
      canArchive={() => false}
      csvFileName="business-cases.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default BusinessCases;
