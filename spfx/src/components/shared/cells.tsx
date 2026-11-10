import * as React from 'react';
import { getTheme, IColumn } from '@fluentui/react';
import { TranslateFn } from '../../i18n/I18n';
import { ownerOfItem, readField } from '../../rules/insights';
import { isClosedStatus } from '../../rules/transitions';
import { DUE_COLUMNS, dueLook, OWNER_COLUMNS, priorityLook, statusLook } from '../../rules/visual';
import { gradientOf, IIdentity } from '../../config/identity';
import { Avatar, IdentityTile, Pill } from './ui';

/** What a person reads in a table: an emoji and a coloured tag instead of plain words. */

export const StatusPill: React.FC<{ status: string; t: TranslateFn }> = ({ status, t }) => {
  const look = statusLook(status);
  return <Pill tone={look.tone} emoji={look.emoji}>{t(`status.${status}`)}</Pill>;
};

/** "🔥 2 d late", "⏰ today", "📅 in 3 d"; nothing when it is far away or closed. */
export const DueChip: React.FC<{ value: string; closed: boolean; t: TranslateFn }> = ({ value, closed, t }) => {
  const look = dueLook(value, closed);
  if (!look || look.kind === 'later') {
    return <></>;
  }
  const text = look.kind === 'late' ? t('due.late', { days: -look.days }) : look.kind === 'today' ? t('due.today') : t('due.soon', { days: look.days });
  return <Pill tone={look.tone} emoji={look.emoji}>{text}</Pill>;
};

export const PriorityPill: React.FC<{ field: string; value: string; t: TranslateFn }> = ({ field, value, t }) => {
  const look = priorityLook(value);
  return look ? <Pill tone={look.tone} emoji={look.emoji}>{t(`${field}.${value}`)}</Pill> : <span>{value}</span>;
};

export const PersonCell: React.FC<{ value: string }> = ({ value }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <Avatar text={value} size={22} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
  </span>
);

/**
 * Dresses a column by what it holds: priorities and severities become tags, due dates get a chip, people
 * get a badge. Other columns are left as the screen made them.
 */
export function decorateColumn<T>(column: IColumn, t: TranslateFn, getStatus: (item: T) => string): IColumn {
  const field = column.fieldName ?? column.key;
  const original = column.onRender;
  const plain = (item: T, index?: number): React.ReactNode => (original ? original(item, index, column) : readField(item, field));

  if (field === 'priority' || field === 'severity') {
    return { ...column, onRender: (item: T, index?: number) => (priorityLook(readField(item, field)) ? <PriorityPill field={field} value={readField(item, field)} t={t} /> : plain(item, index)) };
  }
  if (DUE_COLUMNS.indexOf(field) > -1) {
    return {
      ...column,
      minWidth: Math.max(column.minWidth ?? 0, 150),
      onRender: (item: T, index?: number) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {plain(item, index)}
          <DueChip value={readField(item, field)} closed={isClosedStatus(getStatus(item))} t={t} />
        </span>
      )
    };
  }
  if (OWNER_COLUMNS.indexOf(field) > -1) {
    return { ...column, onRender: (item: T, index?: number) => (readField(item, field) ? <PersonCell value={readField(item, field)} /> : plain(item, index)) };
  }
  return column;
}

export interface IItemCardsProps<T> {
  items: T[];
  selectedId: number | undefined;
  getId: (item: T) => number | undefined;
  getTitle: (item: T) => string;
  getStatus: (item: T) => string;
  hasStatus: boolean;
  isFavorite: (item: T) => boolean;
  onToggleFavorite: (item: T) => void;
  onSelect: (item: T) => void;
  onOpen: (item: T) => void;
  identity: IIdentity;
  /** More facts about the item (a label and what to show), after the tags. */
  extraFields: (item: T) => Array<{ label: string; node: React.ReactNode }>;
  fileCount: (item: T) => number;
  /** Set while several can be chosen: the ticked ids and what to do when one is (un)ticked. */
  checkedIds?: Set<number>;
  onCheck?: (item: T) => void;
  t: TranslateFn;
}

/** The same rows as cards: one per item, with what matters on the surface. Easier to use on a phone. */
export function ItemCards<T>(props: IItemCardsProps<T>): React.ReactElement {
  const theme = getTheme();
  const { items, selectedId, getId, getTitle, getStatus, hasStatus, isFavorite, onToggleFavorite, onSelect, onOpen, identity, extraFields, fileCount, checkedIds, onCheck, t } = props;
  return (
    <div role="list" aria-label={t('view.cards')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {items.map(item => {
        const id = getId(item);
        const selected = id !== undefined && id === selectedId;
        const status = getStatus(item);
        const owner = ownerOfItem(item);
        const dueField = DUE_COLUMNS.filter(f => readField(item, f) !== '')[0];
        const priorityField = ['priority', 'severity'].filter(f => priorityLook(readField(item, f)))[0];
        const on = isFavorite(item);
        const extras = extraFields(item);
        const files = fileCount(item);
        return (
          <div
            key={id}
            role="listitem"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onSelect(item)}
            onDoubleClick={() => onOpen(item)}
            onKeyDown={event => { if (event.key === 'Enter') { onOpen(item); } else if (event.key === ' ') { event.preventDefault(); onSelect(item); } }}
            style={{
              background: theme.palette.white, color: theme.palette.neutralPrimary, borderRadius: 14, padding: '14px 14px 12px', cursor: 'pointer', display: 'grid', gap: 10, position: 'relative', overflow: 'hidden',
              border: `1px solid ${selected ? theme.palette.themePrimary : theme.palette.neutralLighter}`, boxShadow: selected ? `0 0 0 2px ${theme.palette.themeLight}` : '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'transform 120ms ease, box-shadow 120ms ease'
            }}
          >
            <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: gradientOf(identity) }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {checkedIds && onCheck && (
                <input type="checkbox" checked={id !== undefined && checkedIds.has(id)} aria-label={`${t('bulk.tick')}: ${getTitle(item)}`} onClick={event => event.stopPropagation()} onChange={() => onCheck(item)} style={{ width: 18, height: 18, marginTop: 8 }} />
              )}
              <IdentityTile identity={identity} size={34} />
              <strong style={{ flex: 1, fontSize: 15, lineHeight: '20px', overflowWrap: 'anywhere' }}>{getTitle(item)}</strong>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${on ? t('fav.remove') : t('fav.add')}: ${getTitle(item)}`}
                onClick={event => { event.stopPropagation(); onToggleFavorite(item); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, color: on ? '#d29200' : undefined }}
              >
                <span aria-hidden="true">{on ? '★' : '☆'}</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              {hasStatus && status !== '' && <StatusPill status={status} t={t} />}
              {priorityField && <PriorityPill field={priorityField} value={readField(item, priorityField)} t={t} />}
              {dueField && <DueChip value={readField(item, dueField)} closed={isClosedStatus(status)} t={t} />}
              {files > 0 && <Pill tone="neutral" emoji="📎" title={t('fileLinks.title')}>{files}</Pill>}
              {owner && <span style={{ marginLeft: 'auto' }}><Avatar text={owner} size={24} /></span>}
            </div>
            {extras.length > 0 && (
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 2, fontSize: 12 }}>
                {extras.map(f => (
                  <React.Fragment key={f.label}>
                    <dt style={{ color: theme.palette.neutralSecondary }}>{f.label}</dt>
                    <dd style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.node}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
