import * as React from 'react';
import { getTheme } from '@fluentui/react';
import { IIdentity } from '../../config/identity';
import { TranslateFn } from '../../i18n/I18n';
import { dueDateOfItem, ownerOfItem } from '../../rules/insights';
import { isClosedStatus } from '../../rules/transitions';
import { boardColumns, moveTargets } from '../../rules/views3';
import { statusLook } from '../../rules/visual';
import { DueChip } from './cells';
import { Avatar } from './ui';

export interface IBoardViewProps<T> {
  items: T[];
  statuses: string[];
  getStatus: (item: T) => string;
  getTitle: (item: T) => string;
  getId: (item: T) => number | undefined;
  /** The statuses an item may move to; undefined when any is allowed. */
  allowedFor: (item: T) => string[] | undefined;
  onMove: (item: T, status: string) => void;
  onOpen: (item: T) => void;
  onSelect: (item: T) => void;
  selectedId: number | undefined;
  identity: IIdentity;
  t: TranslateFn;
}

/** The list as a board: one column per status. Drag a card to another column, or use "Move to" on the card. */
function BoardView<T>(props: IBoardViewProps<T>): React.ReactElement {
  const theme = getTheme();
  const { items, statuses, getStatus, getTitle, getId, allowedFor, onMove, onOpen, onSelect, selectedId, identity, t } = props;
  const [over, setOver] = React.useState<string | undefined>();
  const columns = boardColumns(items, statuses, getStatus);
  const byId = (id: string): T | undefined => items.filter(i => String(getId(i)) === id)[0];

  return (
    <div role="group" aria-label={t('view.board')} style={{ display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 8 }}>
      {columns.map(column => {
        const look = statusLook(column.status);
        return (
          <section
            key={column.status}
            aria-label={`${t(`status.${column.status}`)}: ${column.items.length}`}
            onDragOver={event => { event.preventDefault(); setOver(column.status); }}
            onDragLeave={() => setOver(undefined)}
            onDrop={event => {
              event.preventDefault();
              setOver(undefined);
              const dragged = byId(event.dataTransfer.getData('text/plain'));
              if (dragged && getStatus(dragged) !== column.status) {
                onMove(dragged, column.status);
              }
            }}
            style={{ flex: '0 0 270px', background: over === column.status ? theme.palette.themeLighter : theme.palette.neutralLighterAlt, border: `1px solid ${over === column.status ? theme.palette.themePrimary : theme.palette.neutralLighter}`, borderRadius: 14, padding: 10, display: 'grid', gap: 8, minHeight: 80 }}
          >
            <header style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <span aria-hidden="true">{look.emoji}</span>
              <span style={{ flex: 1 }}>{t(`status.${column.status}`)}</span>
              <span style={{ fontWeight: 400, color: theme.palette.neutralSecondary }}>{column.items.length}</span>
            </header>
            {column.items.map(item => {
              const id = getId(item);
              const owner = ownerOfItem(item);
              const targets = moveTargets(getStatus(item), allowedFor(item), statuses);
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={event => { event.dataTransfer.setData('text/plain', String(id)); event.dataTransfer.effectAllowed = 'move'; }}
                  onClick={() => onSelect(item)}
                  onDoubleClick={() => onOpen(item)}
                  style={{ background: theme.palette.white, color: theme.palette.neutralPrimary, borderRadius: 10, padding: 10, display: 'grid', gap: 6, cursor: 'grab', borderTop: `3px solid ${identity.from}`, boxShadow: id === selectedId ? `0 0 0 2px ${theme.palette.themePrimary}` : '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  <strong style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{getTitle(item)}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <DueChip value={dueDateOfItem(item) ?? ''} closed={isClosedStatus(getStatus(item))} t={t} />
                    {owner && <span style={{ marginLeft: 'auto' }}><Avatar text={owner} size={22} /></span>}
                  </div>
                  {targets.length > 0 && (
                    <select
                      aria-label={`${t('board.moveTo')}: ${getTitle(item)}`}
                      value=""
                      onClick={event => event.stopPropagation()}
                      onChange={event => { if (event.target.value) { onMove(item, event.target.value); } }}
                      style={{ font: 'inherit', fontSize: 12, padding: 2, borderRadius: 6, border: `1px solid ${theme.palette.neutralLight}`, background: theme.palette.white, color: theme.palette.neutralPrimary }}
                    >
                      <option value="">{t('board.moveTo')}…</option>
                      {targets.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

export default BoardView;
