import * as React from 'react';
import { DefaultButton, getTheme } from '@fluentui/react';
import { useLanguage, TranslateFn } from '../../i18n/I18n';
import { toDayKey } from '../../rules/dates';
import { isClosedStatus } from '../../rules/transitions';
import { itemsByDay, monthGrid, shiftMonth } from '../../rules/views3';
import { dueLook } from '../../rules/visual';
import { lookColor } from './ui';

export interface ICalendarViewProps<T> {
  items: T[];
  getTitle: (item: T) => string;
  getStatus: (item: T) => string;
  getId: (item: T) => number | undefined;
  onOpen: (item: T) => void;
  onSelect: (item: T) => void;
  t: TranslateFn;
}

const MAX_PER_DAY = 3;

/** A month, with each record on the day it is due. Records without a date are not shown here. */
function CalendarView<T>(props: ICalendarViewProps<T>): React.ReactElement {
  const theme = getTheme();
  const language = useLanguage();
  const { items, getTitle, getStatus, getId, onOpen, onSelect, t } = props;
  const today = new Date();
  const [cursor, setCursor] = React.useState<{ year: number; month: number }>({ year: today.getFullYear(), month: today.getMonth() });
  const locale = language === 'es' ? 'es-ES' : 'en-GB';
  const weeks = monthGrid(cursor.year, cursor.month);
  const byDay = itemsByDay(items);
  const todayKey = toDayKey(today);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdays = weeks[0].map(d => { const [y, m, dd] = d.key.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString(locale, { weekday: 'short' }); });
  const without = items.filter(i => Object.keys(byDay).every(k => byDay[k].indexOf(i) === -1)).length;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DefaultButton iconProps={{ iconName: 'ChevronLeft' }} ariaLabel={t('calendar.prev')} onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, -1))} />
        <strong style={{ minWidth: 160, textAlign: 'center', textTransform: 'capitalize', fontSize: 16 }} aria-live="polite">{monthLabel}</strong>
        <DefaultButton iconProps={{ iconName: 'ChevronRight' }} ariaLabel={t('calendar.next')} onClick={() => setCursor(shiftMonth(cursor.year, cursor.month, 1))} />
        <DefaultButton text={t('calendar.today')} onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })} />
        {without > 0 && <span style={{ color: theme.palette.neutralSecondary, fontSize: 12 }}>{t('calendar.withoutDate', { count: without })}</span>}
      </div>
      <div role="grid" aria-label={monthLabel} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
        {weekdays.map(w => <div key={w} role="columnheader" style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: theme.palette.neutralSecondary, padding: '2px 4px' }}>{w}</div>)}
        {weeks.map(week => week.map(day => {
          const entries = byDay[day.key] ?? [];
          return (
            <div
              key={day.key}
              role="gridcell"
              aria-label={day.key}
              style={{ minHeight: 96, padding: 4, borderRadius: 8, display: 'grid', alignContent: 'start', gap: 2, background: day.key === todayKey ? theme.palette.themeLighter : theme.palette.white, border: `1px solid ${day.key === todayKey ? theme.palette.themePrimary : theme.palette.neutralLighter}`, opacity: day.inMonth ? 1 : 0.5 }}
            >
              <span style={{ fontSize: 12, fontWeight: day.key === todayKey ? 700 : 400, color: theme.palette.neutralSecondary }}>{day.day}</span>
              {entries.slice(0, MAX_PER_DAY).map(item => {
                const look = dueLook(day.key, isClosedStatus(getStatus(item)));
                const color = look ? lookColor(look.tone) : theme.palette.neutralTertiary;
                return (
                  <button
                    key={getId(item)}
                    type="button"
                    title={getTitle(item)}
                    onClick={() => onSelect(item)}
                    onDoubleClick={() => onOpen(item)}
                    onKeyDown={event => { if (event.key === 'Enter') { onOpen(item); } }}
                    style={{ textAlign: 'left', border: 'none', borderLeft: `3px solid ${color}`, background: `${color}1f`, color: theme.palette.neutralPrimary, borderRadius: 4, padding: '1px 4px', fontSize: 12, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: 'inherit' }}
                  >
                    {getTitle(item)}
                  </button>
                );
              })}
              {entries.length > MAX_PER_DAY && <span style={{ fontSize: 11, color: theme.palette.neutralSecondary }}>{t('calendar.more', { count: entries.length - MAX_PER_DAY })}</span>}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

export default CalendarView;
