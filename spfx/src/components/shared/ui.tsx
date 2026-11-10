import * as React from 'react';
import { getTheme, keyframes, mergeStyleSets } from '@fluentui/react';
import { LookTone, initialsOf } from '../../rules/visual';
import { useNav } from './Nav';

export type Tone = 'good' | 'info' | 'warning' | 'danger';

export type IconName =
  | 'inbox' | 'clipboard' | 'alert' | 'heart' | 'phone' | 'scale' | 'box' | 'spark' | 'refresh' | 'bulb' | 'flag' | 'rocket'
  | 'check' | 'clock' | 'shield' | 'chart' | 'target' | 'wallet' | 'book' | 'award' | 'users' | 'link' | 'calendar' | 'bolt';

/** Stroke icons drawn here so they do not depend on the icon font being loaded (CSP and offline safe). */
const PATHS: Record<IconName, string> = {
  inbox: 'M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6zM3 13h5l1 3h6l1-3h5',
  clipboard: 'M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h4',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18.5v.5',
  heart: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  scale: 'M12 4v16M5 20h14M5 8h14M5 8l-3 7a3 3 0 0 0 6 0L5 8zM19 8l-3 7a3 3 0 0 0 6 0l-3-7z',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10',
  spark: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z',
  refresh: 'M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  rocket: 'M5 19c0-3 1-4 2-5M14 4c4 0 6 2 6 6-3 0-7 3-9 7l-4-4c4-2 7-6 7-9zM9 15l-4 1 1-4M15 11a1 1 0 1 0 0-.01',
  check: 'M4 12.5l5 5L20 6.5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01',
  wallet: 'M4 7a2 2 0 0 1 2-2h12v4M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2zM16 14.5h.01',
  book: 'M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4zM5 16a4 4 0 0 1 4-4h9',
  award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 14.5L7 21l5-3 5 3-1.5-6.5',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2.5.6 4 2.5 4 5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  calendar: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6zM4 10h16M8 3v4M16 3v4',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z'
};

export const Icon: React.FC<{ name: IconName; size?: number }> = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={PATHS[name]} />
  </svg>
);

export const toneColor = (tone: Tone): string => {
  const p = getTheme().palette;
  return tone === 'good' ? p.green : tone === 'info' ? p.themePrimary : tone === 'warning' ? p.orange : p.redDark;
};

const appear = keyframes({ from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } });

const classes = mergeStyleSets({
  card: {
    animationName: appear,
    animationDuration: '320ms',
    animationFillMode: 'backwards',
    borderRadius: 12,
    padding: 16,
    boxSizing: 'border-box',
    transition: 'box-shadow 160ms ease, transform 160ms ease',
    selectors: { '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' } }
  },
  stat: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gridTemplateRows: 'auto auto',
    columnGap: 8,
    rowGap: 2,
    textAlign: 'left',
    width: '100%',
    border: '1px solid transparent',
    cursor: 'default',
    font: 'inherit',
    selectors: {
      ':focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 }
    }
  },
  statLink: {
    cursor: 'pointer',
    selectors: {
      ':hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0,0,0,0.14)' }
    }
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    textAlign: 'left',
    border: '1px solid transparent',
    font: 'inherit',
    cursor: 'pointer',
    selectors: {
      ':hover': { transform: 'translateX(2px)', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' },
      ':focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 }
    }
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12
  }
});

/** A rounded panel with a soft shadow. */
export const Card: React.FC<{ title?: string; children: React.ReactNode; minWidth?: number }> = ({ title, children, minWidth }) => {
  const theme = getTheme();
  return (
    <section
      className={classes.card}
      style={{ background: theme.palette.white, border: `1px solid ${theme.palette.neutralLighter}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: theme.palette.neutralPrimary, minWidth }}
    >
      {title && <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600 }}>{title}</h3>}
      {children}
    </section>
  );
};

/** A titled group of cards. */
export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const theme = getTheme();
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: theme.palette.neutralSecondary }}>{title}</h3>
      <div className={classes.grid}>{children}</div>
    </div>
  );
};

export interface IStatCardProps {
  label: string;
  value: number;
  tone: Tone;
  icon: IconName;
  /** Tab opened when the card is pressed. */
  tab?: string;
}

/** One number with its label. The label comes right before the value in the page text on purpose. */
export const StatCard: React.FC<IStatCardProps> = ({ label, value, tone, icon, tab }) => {
  const theme = getTheme();
  const nav = useNav();
  const accent = toneColor(tone);
  const body = (
    <>
      <span style={{ gridColumn: 1, gridRow: 1, fontSize: 13, color: theme.palette.neutralSecondary, lineHeight: '18px' }}>{label}</span>
      <span style={{ gridColumn: 1, gridRow: 2, fontSize: 32, fontWeight: 600, lineHeight: '38px', color: tone === 'good' ? theme.palette.neutralPrimary : accent }}>{value}</span>
      <span style={{ gridColumn: 2, gridRow: '1 / span 2', alignSelf: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: accent, color: theme.palette.white }}>
        <Icon name={icon} />
      </span>
    </>
  );
  const style: React.CSSProperties = { background: theme.palette.white, borderColor: theme.palette.neutralLighter, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: theme.palette.neutralPrimary };
  if (!tab) {
    return <div role="group" aria-label={`${label}: ${value}`} className={`${classes.card} ${classes.stat}`} style={style}>{body}</div>;
  }
  return (
    <button type="button" aria-label={`${label}: ${value}`} className={`${classes.card} ${classes.stat} ${classes.statLink}`} style={style} onClick={() => nav.goTo(tab)}>
      {body}
    </button>
  );
};

export interface IAttentionRowProps {
  tone: Tone;
  text: string;
  tab: string;
}

/** One thing that needs attention; pressing it opens the tab where it is handled. */
export const AttentionRow: React.FC<IAttentionRowProps> = ({ tone, text, tab }) => {
  const theme = getTheme();
  const nav = useNav();
  const accent = toneColor(tone);
  return (
    <button
      type="button"
      className={`${classes.card} ${classes.row}`}
      style={{ background: theme.palette.neutralLighterAlt, borderColor: theme.palette.neutralLighter, borderLeft: `4px solid ${accent}`, color: theme.palette.neutralPrimary, padding: '10px 12px' }}
      onClick={() => nav.goTo(tab)}
    >
      <span style={{ color: accent, display: 'inline-flex' }}><Icon name={tone === 'danger' ? 'alert' : tone === 'warning' ? 'clock' : 'spark'} size={18} /></span>
      <span style={{ flex: 1, fontSize: 14 }}>{text}</span>
      <span aria-hidden="true" style={{ color: theme.palette.neutralTertiary, fontSize: 18 }}>›</span>
    </button>
  );
};

/** Top banner of the dashboard. */
export const Hero: React.FC<{ title: string; greeting: string; date: string; summary: string; alertCount: number }> = ({ title, greeting, date, summary, alertCount }) => {
  const theme = getTheme();
  return (
    <header
      style={{
        borderRadius: 16,
        padding: '22px 24px',
        color: theme.palette.white,
        background: `linear-gradient(120deg, ${theme.palette.themeDarker} 0%, ${theme.palette.themePrimary} 55%, ${theme.palette.themeSecondary} 100%)`,
        boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}
    >
      <div style={{ minWidth: 240 }}>
        <div style={{ fontSize: 13, opacity: 0.85, textTransform: 'capitalize' }}>{date}</div>
        <h2 style={{ margin: '2px 0 4px', fontSize: 28, fontWeight: 600 }}>{greeting}</h2>
        <div style={{ fontSize: 14, opacity: 0.9 }}>{title}</div>
      </div>
      <div
        role="status"
        style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}
      >
        <Icon name={alertCount > 0 ? 'bolt' : 'check'} size={22} />
        <span>{summary}</span>
      </div>
    </header>
  );
};

/** Colour for a tone of the visual rules, which also has a quiet "neutral". */
export const lookColor = (tone: LookTone): string => (tone === 'neutral' ? getTheme().palette.neutralSecondary : toneColor(tone));

/** A rounded tag: an emoji and a short text on a soft background of the tone's colour. */
export const Pill: React.FC<{ tone: LookTone; emoji?: string; children: React.ReactNode; title?: string }> = ({ tone, emoji, children, title }) => {
  const color = lookColor(tone);
  return (
    <span
      title={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '1px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, lineHeight: '20px', whiteSpace: 'nowrap', background: `${color}1f`, color: getTheme().palette.neutralPrimary, border: `1px solid ${color}55` }}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      <span>{children}</span>
    </span>
  );
};

const AVATAR_COLORS = ['#0f6cbd', '#8764b8', '#038387', '#c239b3', '#ca5010', '#498205', '#986f0b', '#5c2e91'];

/** A round badge with the initials of a person; the colour is always the same for the same person. */
export const Avatar: React.FC<{ text: string; size?: number }> = ({ text, size = 24 }) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 997;
  }
  return (
    <span
      aria-hidden="true"
      title={text}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', background: AVATAR_COLORS[hash % AVATAR_COLORS.length], color: '#fff', fontSize: Math.round(size * 0.42), fontWeight: 600, flex: 'none' }}
    >
      {initialsOf(text)}
    </span>
  );
};

export interface IDonutSlice {
  key: string;
  label: string;
  count: number;
  color: string;
}

/** A ring split in as many arcs as slices, with a number in the middle. Pressing an arc calls onPress(key). */
export const Donut: React.FC<{ slices: IDonutSlice[]; size?: number; centre?: string; caption?: string; onPress?: (key: string) => void }> = ({ slices, size = 120, centre, caption, onPress }) => {
  const theme = getTheme();
  const total = slices.reduce((sum, s) => sum + s.count, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={slices.map(s => `${s.label}: ${s.count}`).join(', ')}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke={theme.palette.neutralLighter} strokeWidth={12} />
      {total > 0 && slices.map(s => {
        const length = (s.count / total) * circumference;
        const arc = (
          <circle
            key={s.key}
            cx="50" cy="50" r={radius} fill="none" stroke={s.color} strokeWidth={12}
            strokeDasharray={`${Math.max(0, length - 1.2)} ${circumference}`} strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
            style={{ cursor: onPress ? 'pointer' : undefined, transition: 'stroke-dasharray 400ms ease' }}
            onClick={onPress ? () => onPress(s.key) : undefined}
          >
            <title>{`${s.label}: ${s.count}`}</title>
          </circle>
        );
        offset += length;
        return arc;
      })}
      {centre !== undefined && <text x="50" y={caption ? 51 : 56} textAnchor="middle" fontSize="22" fontWeight="600" fill={theme.palette.neutralPrimary}>{centre}</text>}
      {caption && <text x="50" y="65" textAnchor="middle" fontSize="9" fill={theme.palette.neutralSecondary}>{caption}</text>}
    </svg>
  );
};

/** Small bars, one per number, the last one highlighted. Used for activity over time. */
export const Spark: React.FC<{ values: number[]; labels?: string[]; height?: number; ariaLabel: string }> = ({ values, labels, height = 48, ariaLabel }) => {
  const theme = getTheme();
  const max = Math.max(1, ...values);
  return (
    <div role="img" aria-label={ariaLabel} style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {values.map((v, i) => (
        <span
          key={i}
          title={`${labels ? labels[i] : i + 1}: ${v}`}
          style={{ flex: 1, minWidth: 6, height: `${Math.max(6, Math.round((v / max) * 100))}%`, borderRadius: 4, background: i === values.length - 1 ? theme.palette.themePrimary : theme.palette.themeTertiary, opacity: v === 0 ? 0.35 : 1, transition: 'height 400ms ease' }}
        />
      ))}
    </div>
  );
};
