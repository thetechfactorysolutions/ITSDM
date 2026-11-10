import { dueDateOfItem, ownerOfItem } from './insights';
import { toDayKey } from './dates';
import { isClosedStatus } from './transitions';
import { daysBetween } from './visual';

/**
 * The summary of what needs attention (late, due today, due this week) across the lists, ready to read
 * on screen, send by email or post to a Teams / Power Automate flow. Pure.
 */

export interface IDigestSource {
  key: string;
  title: string;
  tab: string;
  items: unknown[];
  getStatus: (item: unknown) => string;
  getTitle: (item: unknown) => string;
}

export interface IDigestEntry {
  title: string;
  due: string;
  days: number;
  owner: string;
}

export interface IDigestSection {
  key: string;
  title: string;
  tab: string;
  late: IDigestEntry[];
  today: IDigestEntry[];
  soon: IDigestEntry[];
}

export interface IDigest {
  sections: IDigestSection[];
  totals: { late: number; today: number; soon: number };
}

const SOON_DAYS = 7;

export const buildDigest = (sources: IDigestSource[], now: Date = new Date()): IDigest => {
  const today = toDayKey(now);
  const sections: IDigestSection[] = [];
  const totals = { late: 0, today: 0, soon: 0 };
  sources.forEach(source => {
    const section: IDigestSection = { key: source.key, title: source.title, tab: source.tab, late: [], today: [], soon: [] };
    source.items.forEach(item => {
      const due = dueDateOfItem(item);
      if (!due || isClosedStatus(source.getStatus(item))) {
        return;
      }
      const days = daysBetween(today, due);
      if (days === undefined) {
        return;
      }
      const entry: IDigestEntry = { title: source.getTitle(item), due, days, owner: ownerOfItem(item) };
      if (days < 0) {
        section.late.push(entry);
      } else if (days === 0) {
        section.today.push(entry);
      } else if (days <= SOON_DAYS) {
        section.soon.push(entry);
      }
    });
    section.late.sort((a, b) => a.days - b.days);
    section.soon.sort((a, b) => a.days - b.days);
    if (section.late.length + section.today.length + section.soon.length > 0) {
      sections.push(section);
      totals.late += section.late.length;
      totals.today += section.today.length;
      totals.soon += section.soon.length;
    }
  });
  return { sections, totals };
};

export interface IDigestLabels {
  title: string;
  late: string;
  today: string;
  soon: string;
  none: string;
}

/** Plain text, one block per list, for an email or a message. */
export const digestText = (digest: IDigest, labels: IDigestLabels, dateLabel: string): string => {
  const lines: string[] = [`${labels.title} · ${dateLabel}`, ''];
  if (digest.sections.length === 0) {
    lines.push(labels.none);
    return lines.join('\n');
  }
  digest.sections.forEach(section => {
    lines.push(section.title.toUpperCase());
    ([['late', labels.late], ['today', labels.today], ['soon', labels.soon]] as Array<['late' | 'today' | 'soon', string]>).forEach(([key, label]) => {
      section[key].forEach(e => lines.push(`- ${label}: ${e.title} (${e.due}${e.owner ? `, ${e.owner}` : ''})`));
    });
    lines.push('');
  });
  return lines.join('\n').trim();
};

/** A mail link. The body is cut so the link stays within what mail programs accept. */
export const mailtoLink = (to: string, subject: string, body: string, maxLength: number = 1800): string => {
  const cut = body.length > maxLength ? `${body.slice(0, maxLength).replace(/\n[^\n]*$/, '')}\n…` : body;
  return `mailto:${encodeURIComponent(to.trim()).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(cut)}`;
};

export const webhookPayload = (digest: IDigest, text: string, user: string, now: Date = new Date()): Record<string, unknown> => ({
  generatedAt: now.toISOString(),
  user,
  late: digest.totals.late,
  today: digest.totals.today,
  soon: digest.totals.soon,
  text,
  sections: digest.sections.map(s => ({ list: s.title, late: s.late, today: s.today, soon: s.soon }))
});

/** Only secure web addresses: the flow link is typed by a person and must not be anything else. */
export const isWebhookUrl = (value: string): boolean => {
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
};
