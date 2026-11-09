import * as React from 'react';
import { DefaultButton, Dropdown, IconButton, Stack, Text, getTheme } from '@fluentui/react';
import { useLanguage, useT } from '../../i18n/I18n';
import { AGENDA_KINDS, AgendaUrgency, buildAgenda, eventsByDay, IAgendaEvent, monthGrid, shiftMonth } from '../../rules/agenda';
import { toDayKey } from '../../rules/dates';
import { useHubData } from '../shared/HubData';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const MAX_PER_CELL = 3;

const Row: React.FC<{ event: IAgendaEvent }> = ({ event }) => {
  const t = useT();
  const theme = getTheme();
  const color = event.urgency === 'OVERDUE' ? theme.palette.redDark : event.urgency === 'TODAY' ? theme.palette.orangeLighter : event.urgency === 'SOON' ? theme.palette.orange : theme.palette.neutralTertiary;
  return (
    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { borderLeft: `4px solid ${color}`, paddingLeft: 8 } }}>
      <Text variant="small" styles={{ root: { minWidth: 82 } }}>{event.date}</Text>
      <Stack.Item grow>
        <Text block>{event.title}</Text>
        <Text variant="small">{t(`agenda.kind.${event.kind}`)}</Text>
      </Stack.Item>
    </Stack>
  );
};

/** One calendar with every date in the app: what is overdue, what falls today and in the next days, and a month view. */
const Agenda: React.FC = () => {
  const t = useT();
  const theme = getTheme();
  const language = useLanguage();
  const hub = useHubData();
  const now = new Date();
  const today = toDayKey(now);
  const [cursor, setCursor] = React.useState<{ year: number; month: number }>({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = React.useState<string>(today);
  const [kind, setKind] = React.useState<string>('');

  const events = React.useMemo(() => buildAgenda({
    matters: hub.matters.items, actions: hub.actions.items, contracts: hub.contracts.items, entitlements: hub.entitlements.items, interactions: hub.interactions.items, reviews: hub.reviews.items,
    risks: hub.risks.items, trainings: hub.trainings.items, skills: hub.skills.items, projects: hub.projects.items, articles: hub.articles.items, changes: hub.changes.items, incidents: hub.incidents.items,
    stock: hub.stock.items, genius: hub.genius.items, objectives: hub.objectives.items
  }), [hub.matters.items, hub.actions.items, hub.contracts.items, hub.entitlements.items, hub.interactions.items, hub.reviews.items, hub.risks.items, hub.trainings.items, hub.skills.items,
    hub.projects.items, hub.articles.items, hub.changes.items, hub.incidents.items, hub.stock.items, hub.genius.items, hub.objectives.items]);

  const shown = kind ? events.filter(e => e.kind === kind) : events;
  const byDay = eventsByDay(shown);
  const weeks = monthGrid(cursor.year, cursor.month);
  const byUrgency = (urgency: AgendaUrgency): IAgendaEvent[] => shown.filter(e => e.urgency === urgency);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(language, { month: 'long', year: 'numeric' });
  const dayEvents = byDay[selectedDay] ?? [];

  const kindOptions = [{ key: '', text: t('agenda.allKinds') }].concat(AGENDA_KINDS.map(k => ({ key: k, text: t(`agenda.kind.${k}`) })));
  const sections: Array<{ urgency: AgendaUrgency; title: string }> = [
    { urgency: 'OVERDUE', title: t('agenda.overdue') }, { urgency: 'TODAY', title: t('agenda.today') }, { urgency: 'SOON', title: t('agenda.soon') }
  ];
  const later = byUrgency('LATER').slice(0, 15);

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      <Text variant="xLarge" as="h2">{t('agenda.title')}</Text>

      <Stack horizontal wrap verticalAlign="end" tokens={{ childrenGap: 12 }}>
        <Dropdown label={t('agenda.filter')} selectedKey={kind} options={kindOptions} styles={{ root: { minWidth: 240 } }} onChange={(_, o) => setKind(o ? String(o.key) : '')} />
      </Stack>

      {shown.length === 0 && <Text>{t('agenda.nothing')}</Text>}

      {sections.map(section => {
        const rows = byUrgency(section.urgency);
        return rows.length === 0 ? null : (
          <Stack key={section.urgency} tokens={{ childrenGap: 6 }}>
            <Text variant="large" as="h3">{section.title} ({rows.length})</Text>
            {rows.map(event => <Row key={event.key} event={event} />)}
          </Stack>
        );
      })}

      <Stack tokens={{ childrenGap: 8 }}>
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
          <IconButton iconProps={{ iconName: 'ChevronLeft' }} title={t('agenda.prevMonth')} ariaLabel={t('agenda.prevMonth')} onClick={() => setCursor(c => shiftMonth(c.year, c.month, -1))} />
          <Text variant="large" as="h3" styles={{ root: { minWidth: 170, textAlign: 'center', textTransform: 'capitalize' } }} aria-live="polite">{monthLabel}</Text>
          <IconButton iconProps={{ iconName: 'ChevronRight' }} title={t('agenda.nextMonth')} ariaLabel={t('agenda.nextMonth')} onClick={() => setCursor(c => shiftMonth(c.year, c.month, 1))} />
          <DefaultButton text={t('agenda.today')} onClick={() => { setCursor({ year: now.getFullYear(), month: now.getMonth() }); setSelectedDay(today); }} />
        </Stack>

        <div role="group" aria-label={monthLabel} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
          {WEEKDAYS.map(d => <Text key={d} variant="small" styles={{ root: { fontWeight: 600, textAlign: 'center' } }}>{t(`agenda.weekday.${d}`)}</Text>)}
          {weeks.map(week => week.map(cell => {
            const list = byDay[cell.date] ?? [];
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDay;
            return (
              <button
                key={cell.date}
                type="button"
                aria-label={`${cell.date}${list.length ? `: ${list.length}` : ''}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDay(cell.date)}
                style={{
                  minHeight: 78, textAlign: 'left', padding: 4, cursor: 'pointer', overflow: 'hidden', font: 'inherit', color: 'inherit',
                  background: isSelected ? theme.palette.themeLighter : cell.inMonth ? theme.palette.white : theme.palette.neutralLighterAlt,
                  border: `${isToday ? 2 : 1}px solid ${isToday ? theme.palette.themePrimary : theme.palette.neutralLight}`, opacity: cell.inMonth ? 1 : 0.6
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400 }}>{Number(cell.date.slice(8))}</span>
                {list.slice(0, MAX_PER_CELL).map(event => (
                  <span key={event.key} style={{ display: 'block', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: event.urgency === 'OVERDUE' ? theme.palette.redDark : undefined }}>
                    {event.title}
                  </span>
                ))}
                {list.length > MAX_PER_CELL && <span style={{ fontSize: 11 }}>{t('agenda.moreEvents', { count: list.length - MAX_PER_CELL })}</span>}
              </button>
            );
          }))}
        </div>

        <Stack tokens={{ childrenGap: 6 }} aria-live="polite">
          <Text variant="mediumPlus" as="h3">{t('agenda.dayEvents', { date: selectedDay })}</Text>
          {dayEvents.length === 0 ? <Text>{t('agenda.noEventsDay')}</Text> : dayEvents.map(event => <Row key={event.key} event={event} />)}
        </Stack>
      </Stack>

      {later.length > 0 && (
        <Stack tokens={{ childrenGap: 6 }}>
          <Text variant="large" as="h3">{t('agenda.later')}</Text>
          {later.map(event => <Row key={event.key} event={event} />)}
        </Stack>
      )}
    </Stack>
  );
};

export default Agenda;
