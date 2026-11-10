/**
 * What each module and each list looks like: an emoji and a pair of colours for its gradient. One place,
 * so the tabs, the screen headers, the cards, the empty states and the quick search all agree.
 */

export interface IIdentity {
  emoji: string;
  from: string;
  to: string;
}

const g = (emoji: string, from: string, to: string): IIdentity => ({ emoji, from, to });

const BLUE = ['#0f6cbd', '#4f9bdc'];
const TEAL = ['#038387', '#2bb5b8'];
const PURPLE = ['#6b4fbb', '#a58be0'];
const ORANGE = ['#ca5010', '#f08a4b'];
const GREEN = ['#2e7d32', '#6cc070'];
const PINK = ['#b4259b', '#e06fcc'];
const GOLD = ['#b07d00', '#f2c230'];
const SLATE = ['#4a5a6a', '#8397ab'];
const RED = ['#b3261e', '#ee6a60'];

const on = (emoji: string, c: string[]): IIdentity => g(emoji, c[0], c[1]);

export const TAB_IDENTITY: Record<string, IIdentity> = {
  dashboard: on('🏠', BLUE), matters: on('📥', ORANGE), agenda: on('🗓️', TEAL), links: on('🔗', BLUE), ideas: on('💡', GOLD), initiatives: on('🚀', PURPLE),
  projects: on('🧭', TEAL), actions: on('✅', GREEN), purchases: on('🛒', ORANGE), finance: on('💶', GREEN), vendors: on('🤝', BLUE), operations: on('🛠️', SLATE),
  people: on('🎓', PINK), devices: on('💻', SLATE), genius: on('🧠', PURPLE), strategy: on('🎯', RED), weekly: on('📝', TEAL), governance: on('⚖️', SLATE),
  notes: on('🗒️', GOLD), alerts: on('🔔', RED), import: on('📤', BLUE), help: on('❓', SLATE)
};

/** By the list's number (the part of its title before the name): IT_04_Actions → '04'. */
const LIST_IDENTITY: Record<string, IIdentity> = {
  '01': on('💡', GOLD), '02': on('🚀', PURPLE), '03': on('🧭', TEAL), '04': on('✅', GREEN), '05': on('📊', BLUE), '06': on('💰', GREEN), '07': on('🏗️', GREEN),
  '08': on('🔄', GREEN), '09': on('🤝', BLUE), '10': on('📜', SLATE), '11': on('⚠️', RED), '12': on('⚖️', SLATE), '13': on('🚨', RED), '14': on('💬', TEAL),
  '15': on('🔧', ORANGE), '16': on('🧩', PINK), '17': on('🎓', PINK), '18': on('📚', PINK), '19': on('🔍', SLATE), '20': on('📖', PINK), '21': on('🗓️', TEAL),
  '22': on('🗒️', GOLD), '23': on('📥', ORANGE), '24': on('🏷️', TEAL), '25': on('🔗', BLUE), '26': on('🔐', SLATE), '27': on('😊', GOLD), '28': on('📈', BLUE),
  '29': on('🗂️', TEAL), '30': on('💻', SLATE), '31': on('🧠', PURPLE), '32': on('🎯', RED), '33': on('📑', RED), '34': on('📝', TEAL), '35': on('🧾', ORANGE),
  '36': on('🛒', ORANGE), '37': on('🔑', SLATE), '38': on('⭐', GOLD), '39': on('📎', BLUE)
};

const FALLBACK: IIdentity = on('📋', SLATE);

export const identityForTab = (tab: string): IIdentity => TAB_IDENTITY[tab] ?? FALLBACK;

export const identityForList = (listName: string): IIdentity => {
  const match = /^IT_(\d{2})_/.exec(listName);
  return (match && LIST_IDENTITY[match[1]]) || FALLBACK;
};

export const gradientOf = (identity: IIdentity): string => `linear-gradient(135deg, ${identity.from}, ${identity.to})`;
