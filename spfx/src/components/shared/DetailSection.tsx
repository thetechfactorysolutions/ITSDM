import * as React from 'react';
import { Stack, Text } from '@fluentui/react';
import { useT } from '../../i18n/I18n';

export interface IDetailRow {
  label: string;
  value: string | number | undefined;
}

/** Label/value pairs for a detail panel; empty values are shown as a dash. */
export const DetailFields: React.FC<{ rows: IDetailRow[] }> = ({ rows }) => (
  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(110px, auto) 1fr', gap: '6px 12px' }}>
    {rows.map(row => (
      <React.Fragment key={row.label}>
        <dt style={{ fontWeight: 600 }}>{row.label}</dt>
        <dd style={{ margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{row.value === undefined || row.value === '' ? '—' : row.value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

export interface IRelatedItem {
  key: string;
  title: string;
  meta?: string;
}

/** A titled list of related items (the projects of an initiative, the actions of a project...). */
export const RelatedList: React.FC<{ title: string; items: IRelatedItem[] }> = ({ title, items }) => {
  const t = useT();

  return (
    <Stack tokens={{ childrenGap: 4 }}>
      <Text variant="large" as="h3">{title} ({items.length})</Text>
      {items.length === 0 ? (
        <Text>{t('common.noneRelated')}</Text>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {items.map(item => (
            <li key={item.key}>{item.title}{item.meta ? ` — ${item.meta}` : ''}</li>
          ))}
        </ul>
      )}
    </Stack>
  );
};
