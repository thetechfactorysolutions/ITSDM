/** Changing several records at once: which ones can move to the chosen status and which are left alone, and why. */

export type SkipReason = 'same' | 'notAllowed' | 'needsApproval';

export interface IBulkPlan<T> {
  apply: T[];
  skipped: Array<{ item: T; reason: SkipReason }>;
}

export const planBulkStatus = <T,>(
  items: T[],
  target: string,
  statusOf: (item: T) => string,
  /** The statuses an item may move to; undefined when any is allowed. */
  allowedFor: (item: T) => string[] | undefined,
  /** True when an approval rule stops this change. */
  blockedFor: (item: T, status: string) => boolean
): IBulkPlan<T> => {
  const plan: IBulkPlan<T> = { apply: [], skipped: [] };
  items.forEach(item => {
    const allowed = allowedFor(item);
    if (statusOf(item) === target) {
      plan.skipped.push({ item, reason: 'same' });
    } else if (allowed && allowed.indexOf(target) === -1) {
      plan.skipped.push({ item, reason: 'notAllowed' });
    } else if (blockedFor(item, target)) {
      plan.skipped.push({ item, reason: 'needsApproval' });
    } else {
      plan.apply.push(item);
    }
  });
  return plan;
};
