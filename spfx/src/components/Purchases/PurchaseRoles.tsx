import * as React from 'react';
import { Dropdown, IColumn, MessageBar, TextField } from '@fluentui/react';
import { AppConfig } from '../../config/AppConfig';
import { csvEnum, enumValues } from '../../entities/csvHelpers';
import { buildPurchaseRolePayload } from '../../entities/payloads';
import { useT } from '../../i18n/I18n';
import { PurchaseRoleEntry, PurchaseRoleType } from '../../models';
import { isApprover } from '../../rules/purchases';
import { validatePurchaseRole } from '../../rules/validation';
import { DetailFields } from '../shared/DetailSection';
import EntityScreen, { IFormContext } from '../shared/EntityScreen';
import { FormRow } from '../shared/FormGrid';
import { useHubData } from '../shared/HubData';
import { toOptions } from '../shared/options';
import UserField from '../shared/UserField';
import { usePurchaseRole } from './usePurchaseRole';

const ROLES = enumValues(PurchaseRoleType);

const searchFields = [(r: PurchaseRoleEntry) => r.title, (r: PurchaseRoleEntry) => r.userUpn];
const sortAccessors = { title: (r: PurchaseRoleEntry) => r.title, userUpn: (r: PurchaseRoleEntry) => r.userUpn, role: (r: PurchaseRoleEntry) => r.role };
const csvColumns = [
  { header: 'Title', value: (r: PurchaseRoleEntry) => r.title }, { header: 'UserUPN', value: (r: PurchaseRoleEntry) => r.userUpn },
  { header: 'Role', value: (r: PurchaseRoleEntry) => r.role }, { header: 'Notes', value: (r: PurchaseRoleEntry) => r.notes }
];

/** Who can request, order, approve or only look at purchases. */
const PurchaseRoles: React.FC = () => {
  const t = useT();
  const { service, purchaseRoles: state } = useHubData();
  const role = usePurchaseRole();
  const approver = isApprover(role);
  const hasApprover = state.items.some(r => r.role === PurchaseRoleType.APPROVER);

  const columns: IColumn[] = [
    { key: 'title', name: t('field.name'), fieldName: 'title', minWidth: 160 },
    { key: 'userUpn', name: t('field.email'), fieldName: 'userUpn', minWidth: 200 },
    { key: 'role', name: t('field.role'), minWidth: 140, onRender: (r: PurchaseRoleEntry) => t(`role.${r.role}`) }
  ];

  const newItem = React.useCallback((): PurchaseRoleEntry => ({ title: '', userUpn: '', role: PurchaseRoleType.REQUESTER, notes: '' }), []);
  const csvFromRow = React.useCallback((row: Record<string, string>): PurchaseRoleEntry => ({
    title: row.Title ?? '', userUpn: row.UserUPN ?? '', role: csvEnum(row.Role, ROLES, PurchaseRoleType.REQUESTER), notes: row.Notes ?? ''
  }), []);

  const renderForm = ({ form, setForm, errors, service: svc }: IFormContext<PurchaseRoleEntry>): React.ReactNode => (
    <>
      <FormRow full><TextField label={t('field.name')} required value={form.title} errorMessage={errors.title && t(errors.title)} onChange={(_, v) => setForm(p => ({ ...p, title: v ?? '' }))} /></FormRow>
      <UserField label={t('field.email')} required service={svc} value={form.userUpn} errorMessage={errors.ownerUpn && t(errors.ownerUpn)} onChange={e => setForm(p => ({ ...p, userUpn: e }))} />
      <Dropdown label={t('field.role')} selectedKey={form.role} options={toOptions(ROLES, t, 'role')} onChange={(_, o) => setForm(p => ({ ...p, role: (o?.key as PurchaseRoleType) ?? PurchaseRoleType.REQUESTER }))} />
      <FormRow full><MessageBar>{t(`purchase.roleHint.${form.role}`)}</MessageBar></FormRow>
      <FormRow full><TextField label={t('field.notes')} multiline rows={2} value={form.notes} onChange={(_, v) => setForm(p => ({ ...p, notes: v ?? '' }))} /></FormRow>
    </>
  );

  const renderDetail = (r: PurchaseRoleEntry): React.ReactNode => (
    <DetailFields rows={[
      { label: t('field.name'), value: r.title }, { label: t('field.email'), value: r.userUpn }, { label: t('field.role'), value: t(`role.${r.role}`) }, { label: t('field.notes'), value: r.notes }
    ]} />
  );

  return (
    <EntityScreen<PurchaseRoleEntry>
      textKey="purchaseRoles"
      listName={AppConfig.sharePoint.listNames.purchaseRoles}
      state={state}
      service={service}
      statuses={[]}
      getStatus={() => ''}
      getTitle={r => r.title}
      columns={columns}
      sortAccessors={sortAccessors}
      searchFields={searchFields}
      newItem={newItem}
      validate={validatePurchaseRole}
      buildPayload={buildPurchaseRolePayload}
      renderForm={renderForm}
      renderDetail={renderDetail}
      hideNew={!approver}
      hideImport
      canEdit={() => approver}
      canDelete={() => approver}
      hideArchive
      archiveStatus=""
      canArchive={() => false}
      hideAttachments
      extraContent={<MessageBar>{hasApprover ? t('purchase.rolesInfo') : t('purchase.rolesNoApprover')}</MessageBar>}
      csvFileName="purchase-roles.csv"
      csvColumns={csvColumns}
      csvFromRow={csvFromRow}
    />
  );
};

export default PurchaseRoles;
