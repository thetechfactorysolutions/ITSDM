import * as React from 'react';
import { DefaultButton, Dropdown, getTheme, IDropdownOption } from '@fluentui/react';
import { useT } from '../../i18n/I18n';

export interface IBulkBarProps {
  count: number;
  statuses: string[];
  canArchive: boolean;
  onStatus: (status: string) => void;
  onArchive: () => void;
  onExport: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}

/** Appears when several records are ticked: change their status, archive, export them. */
const BulkBar: React.FC<IBulkBarProps> = ({ count, statuses, canArchive, onStatus, onArchive, onExport, onSelectAll, onClear }) => {
  const t = useT();
  const theme = getTheme();
  const options: IDropdownOption[] = statuses.map(s => ({ key: s, text: t(`status.${s}`) }));
  return (
    <div role="toolbar" aria-label={t('bulk.title')} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: theme.palette.themeLighter, border: `1px solid ${theme.palette.themeLight}` }}>
      <strong>{t('bulk.selected', { count })}</strong>
      {statuses.length > 0 && <Dropdown ariaLabel={t('bulk.changeStatus')} placeholder={t('bulk.changeStatus')} selectedKey={null} options={options} disabled={count === 0} styles={{ root: { minWidth: 180 } }} onChange={(_, option) => { if (option) { onStatus(String(option.key)); } }} />}
      {canArchive && <DefaultButton text={t('common.archive')} iconProps={{ iconName: 'Archive' }} disabled={count === 0} onClick={onArchive} />}
      <DefaultButton text={t('bulk.export')} iconProps={{ iconName: 'Download' }} disabled={count === 0} onClick={onExport} />
      <DefaultButton text={t('bulk.all')} onClick={onSelectAll} />
      <DefaultButton text={t('bulk.clear')} onClick={onClear} />
    </div>
  );
};

export default BulkBar;
