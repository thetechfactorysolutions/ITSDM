/** Amount for display, with the thousands separator of the user's browser and at most two decimals. */
export const formatMoney = (value: number): string => (isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

/** 0.943 -> "94%". */
export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** A plain number for display (a KPI value, a count): same grouping as amounts, at most two decimals. */
export const formatNumber = (value: number): string => (isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');
