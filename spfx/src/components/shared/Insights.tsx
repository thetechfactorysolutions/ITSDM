import * as React from 'react';
import { getTheme, mergeStyleSets } from '@fluentui/react';
import { useT } from '../../i18n/I18n';
import {
  autoGroupFields, countBy, hasDueDates, isMine, isOpenItem, isPastDue, ownerOfItem, readField, recentlyUpdated, statusCounts, updatedWithin
} from '../../rules/insights';
import { useHubData } from './HubData';
import { statusLook, weeklyActivity } from '../../rules/visual';
import { Donut, Icon, IconName, Spark, Tone, toneColor } from './ui';

/** One colour per status, the same in the ring and in the tag that filters it. */
const RING = ['#0f6cbd', '#038387', '#8764b8', '#ca5010', '#498205', '#c239b3', '#986f0b', '#5c2e91', '#69797e'];

/** A filter over the table, set by pressing a number, a status or a bar. */
export interface IChip<T> {
  key: string;
  label: string;
  test: (item: T) => boolean;
}

export interface IInsightStat<T> {
  key: string;
  label: string;
  icon: IconName;
  tone: Tone;
  count: number;
  chip?: IChip<T>;
}

export interface IInsightBar<T> {
  key: string;
  label: string;
  count: number;
  test: (item: T) => boolean;
}

export interface IInsightGroup<T> {
  key: string;
  title: string;
  bars: (items: T[]) => Array<IInsightBar<T>>;
}

/** Extra figures and charts a screen adds to the summary; the usual ones come with every screen. */
export interface IInsightsConfig<T> {
  stats?: (items: T[]) => Array<IInsightStat<T>>;
  groups?: Array<IInsightGroup<T>>;
}

interface IItemLike {
  id?: number;
  modified?: string;
}

export interface IInsightsProps<T extends IItemLike> {
  /** What the person can see in the list, closed ones included. */
  items: T[];
  statuses: string[];
  getStatus: (item: T) => string;
  getTitle: (item: T) => string;
  config?: IInsightsConfig<T>;
  favoriteIds: Set<string>;
  activeChip: IChip<T> | undefined;
  onChip: (chip: IChip<T> | undefined) => void;
  activeStatus: string;
  onStatus: (status: string) => void;
  onOpen: (item: T) => void;
  open: boolean;
  onToggle: () => void;
}

const classes = mergeStyleSets({
  mini: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 10,
    border: '1px solid transparent',
    font: 'inherit',
    cursor: 'pointer',
    transition: 'transform 120ms ease, box-shadow 120ms ease',
    selectors: { ':hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }, ':focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 } }
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 10px',
    borderRadius: 999,
    border: '1px solid transparent',
    font: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
    selectors: { ':hover': { filter: 'brightness(0.96)' }, ':focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 } }
  },
  bar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(70px, 1fr) 90px 28px',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '2px 4px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    font: 'inherit',
    fontSize: 13,
    textAlign: 'left',
    cursor: 'pointer',
    selectors: { ':hover': { background: 'rgba(128,128,128,0.12)' }, ':focus-visible': { outline: '2px solid currentColor', outlineOffset: 1 } }
  }
});

const MiniStat: React.FC<{ stat: IInsightStat<never>; active: boolean; onPress: () => void }> = ({ stat, active, onPress }) => {
  const theme = getTheme();
  const accent = toneColor(stat.tone);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${stat.label}: ${stat.count}`}
      className={classes.mini}
      style={{ background: active ? theme.palette.themeLighter : theme.palette.neutralLighterAlt, borderColor: active ? theme.palette.themePrimary : theme.palette.neutralLighter, color: theme.palette.neutralPrimary }}
      onClick={onPress}
    >
      <span style={{ color: accent, display: 'inline-flex' }}><Icon name={stat.icon} size={18} /></span>
      <span style={{ fontSize: 13, color: theme.palette.neutralSecondary }}>{stat.label}</span>
      <span style={{ fontSize: 20, fontWeight: 600, color: stat.tone === 'good' || stat.tone === 'info' ? theme.palette.neutralPrimary : accent }}>{stat.count}</span>
    </button>
  );
};

const NO_ITEMS: Array<{ vendorId: string; title: string }> = [];
const NO_AREAS: Array<{ areaId: string; title: string }> = [];

const Insights = <T extends IItemLike>(props: IInsightsProps<T>): React.ReactElement => {
  const t = useT();
  const theme = getTheme();
  const { userEmail, vendors, areas } = useHubData();
  const { items, statuses, getStatus, getTitle, config, favoriteIds, activeChip, onChip, activeStatus, onStatus, onOpen, open, onToggle } = props;

  const vendorItems = vendors ? vendors.items : NO_ITEMS;
  const areaItems = areas ? areas.items : NO_AREAS;
  const vendorTitles = React.useMemo(() => {
    const map: Record<string, string> = {};
    vendorItems.forEach(v => { map[v.vendorId] = v.title; });
    return map;
  }, [vendorItems]);

  const areaTitles = React.useMemo(() => {
    const map: Record<string, string> = {};
    areaItems.forEach(a => { map[a.areaId] = a.title; });
    return map;
  }, [areaItems]);

  const chip = (key: string, label: string, test: (item: T) => boolean): IChip<T> => ({ key, label, test });

  // ----- the figures every list has -----
  const stats: Array<IInsightStat<T>> = [{ key: 'total', label: t('insights.total'), icon: 'clipboard', tone: 'info', count: items.length }];
  if (statuses.length > 0) {
    const openItems = items.filter(i => isOpenItem(getStatus(i)));
    stats.push({ key: 'open', label: t('insights.open'), icon: 'bolt', tone: 'info', count: openItems.length, chip: chip('open', t('insights.open'), i => isOpenItem(getStatus(i))) });
  }
  if (hasDueDates(items)) {
    const late = items.filter(i => isPastDue(i, getStatus(i)));
    stats.push({ key: 'late', label: t('insights.pastDue'), icon: 'clock', tone: late.length > 0 ? 'danger' : 'good', count: late.length, chip: chip('late', t('insights.pastDue'), i => isPastDue(i, getStatus(i))) });
  }
  if (items.some(i => ownerOfItem(i) !== '')) {
    stats.push({ key: 'mine', label: t('insights.mine'), icon: 'users', tone: 'info', count: items.filter(i => isMine(i, userEmail)).length, chip: chip('mine', t('insights.mine'), i => isMine(i, userEmail)) });
  }
  const isFav = (i: T): boolean => i.id !== undefined && favoriteIds.has(String(i.id));
  stats.push({ key: 'fav', label: t('insights.favorites'), icon: 'award', tone: 'warning', count: items.filter(isFav).length, chip: chip('fav', t('insights.favorites'), isFav) });
  stats.push({ key: 'week', label: t('insights.week'), icon: 'refresh', tone: 'info', count: items.filter(i => updatedWithin(i, 7)).length, chip: chip('week', t('insights.week'), i => updatedWithin(i, 7)) });
  (config?.stats ? config.stats(items) : []).forEach(s => stats.push(s));

  // ----- what is most used: the fields of the list that repeat, and what the screen adds -----
  const label = (field: string, value: string): string => {
    if (field === 'vendorId') {
      return vendorTitles[value] ?? value;
    }
    if (field === 'areaId') {
      return areaTitles[value] ?? value;
    }
    if (field === 'priority' || field === 'severity') {
      const key = `${field}.${value}`;
      const text = t(key);
      return text === key ? value : text;
    }
    return value;
  };
  const groups: Array<IInsightGroup<T>> = autoGroupFields(items).map(field => ({
    key: field,
    title: t(`insights.by.${field}`),
    bars: (all: T[]) => countBy(all, i => readField(i, field), 5).map(b => ({ key: b.key, label: label(field, b.key), count: b.count, test: (i: T) => readField(i, field) === b.key }))
  }));
  (config?.groups ?? []).forEach(g => groups.push(g));

  const statusBars = statusCounts(items, getStatus, statuses);
  const activity = React.useMemo(() => weeklyActivity(items, 8), [items]);
  const starred = items.filter(isFav).slice(0, 8);
  const recent = items.length > 8 ? recentlyUpdated(items.filter(i => isOpenItem(getStatus(i)) || statuses.length === 0), 5) : [];

  const card: React.CSSProperties = { background: theme.palette.white, border: `1px solid ${theme.palette.neutralLighter}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', color: theme.palette.neutralPrimary };

  if (items.length === 0) {
    return <></>;
  }

  return (
    <section aria-label={t('insights.title')} style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 600, fontSize: 14, color: theme.palette.neutralPrimary, padding: 0 }}
        >
          <span aria-hidden="true">{open ? '▾' : '▸'}</span> {t('insights.title')}
        </button>
        {activeChip && (
          <button
            type="button"
            className={classes.pill}
            style={{ background: theme.palette.themeLighter, borderColor: theme.palette.themePrimary, color: theme.palette.neutralPrimary }}
            aria-label={t('insights.clear', { label: activeChip.label })}
            onClick={() => onChip(undefined)}
          >
            {t('insights.filter', { label: activeChip.label })} <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {open && (
        <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.map(s => (
              <MiniStat
                key={s.key}
                stat={s as unknown as IInsightStat<never>}
                active={!!activeChip && !!s.chip && activeChip.key === s.chip.key}
                onPress={() => onChip(s.chip && !(activeChip && activeChip.key === s.chip.key) ? s.chip : undefined)}
              />
            ))}
          </div>

          {(statusBars.length > 1 || activity.some(n => n > 0)) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
              {statusBars.length > 1 && (
                <>
                  <Donut
                    slices={statusBars.map((b, i) => ({ key: b.key, label: t(`status.${b.key}`), count: b.count, color: RING[i % RING.length] }))}
                    centre={String(items.length)}
                    caption={t('insights.items')}
                    onPress={key => onStatus(activeStatus === key ? '' : key)}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: '1 1 260px' }} role="group" aria-label={t('insights.byStatus')}>
                    {statusBars.map((b, i) => (
                      <button
                        key={b.key}
                        type="button"
                        aria-pressed={activeStatus === b.key}
                        className={classes.pill}
                        style={{ background: activeStatus === b.key ? theme.palette.themePrimary : theme.palette.neutralLighter, color: activeStatus === b.key ? theme.palette.white : theme.palette.neutralPrimary }}
                        onClick={() => onStatus(activeStatus === b.key ? '' : b.key)}
                      >
                        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: RING[i % RING.length], display: 'inline-block' }} />
                        <span aria-hidden="true">{statusLook(b.key).emoji}</span>
                        {t(`status.${b.key}`)} <strong>{b.count}</strong>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {activity.some(n => n > 0) && (
                <div style={{ flex: '1 1 200px', maxWidth: 320 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.palette.neutralSecondary, marginBottom: 6 }}>📈 {t('insights.activity')}</div>
                  <Spark values={activity} labels={activity.map((_, i) => t('insights.activityWeek', { n: i + 1 }))} ariaLabel={t('insights.activity')} />
                </div>
              )}
            </div>
          )}

          {groups.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 380px))', gap: 24 }}>
              {groups.map(g => {
                const bars = g.bars(items);
                const max = Math.max(1, ...bars.map(b => b.count));
                if (bars.length === 0) {
                  return undefined;
                }
                return (
                  <div key={g.key}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.palette.neutralSecondary, marginBottom: 4 }}>{g.title}</div>
                    {bars.map(b => {
                      const key = `${g.key}:${b.key}`;
                      const active = !!activeChip && activeChip.key === key;
                      return (
                        <button
                          key={b.key}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${b.label}: ${b.count}`}
                          className={classes.bar}
                          style={{ color: theme.palette.neutralPrimary, background: active ? theme.palette.themeLighter : undefined }}
                          onClick={() => onChip(active ? undefined : { key, label: b.label, test: b.test })}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                          <span aria-hidden="true" style={{ background: theme.palette.neutralLighter, borderRadius: 4, height: 8, display: 'block' }}>
                            <span style={{ display: 'block', height: 8, borderRadius: 4, background: theme.palette.themePrimary, width: `${Math.max(6, Math.round((b.count / max) * 100))}%` }} />
                          </span>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{b.count}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {starred.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.palette.neutralSecondary }}>★ {t('insights.favorites')}</span>
              {starred.map(i => (
                <button key={i.id} type="button" className={classes.pill} style={{ background: theme.palette.neutralLighter, color: theme.palette.neutralPrimary }} onClick={() => onOpen(i)}>{getTitle(i)}</button>
              ))}
            </div>
          )}

          {recent.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: theme.palette.neutralSecondary }}>{t('insights.recent')}</span>
              {recent.map(i => (
                <button key={i.id} type="button" className={classes.pill} style={{ background: theme.palette.neutralLighter, color: theme.palette.neutralPrimary }} onClick={() => onOpen(i)}>{getTitle(i)}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Insights;
