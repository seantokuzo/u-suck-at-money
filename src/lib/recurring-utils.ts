/**
 * Utility functions for recurring expense calculations.
 *
 * Handles frequency normalization (to monthly/annual equivalents)
 * and next-due-date computation.
 */

type Frequency =
  | "weekly"
  | "biweekly"
  | "semi_monthly"
  | "monthly"
  | "quarterly"
  | "annual";

interface RecurringExpenseForDueDate {
  frequency: Frequency;
  dueDay: number | null;
  dueMonth: number | null;
}

// ─── Frequency → Monthly Multiplier ──────────────────────

const MONTHLY_MULTIPLIERS: Record<Frequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semi_monthly: 2,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

/** Convert an amount in cents at a given frequency to its monthly equivalent in cents */
export function toMonthlyCents(amountCents: number, frequency: Frequency): number {
  return Math.round(amountCents * MONTHLY_MULTIPLIERS[frequency]);
}

/** Convert an amount in cents at a given frequency to its annual equivalent in cents */
export function toAnnualCents(amountCents: number, frequency: Frequency): number {
  return Math.round(toMonthlyCents(amountCents, frequency) * 12);
}

// ─── Next Due Date ───────────────────────────────────────

/**
 * Calculate the next due date for a recurring expense.
 *
 * Logic by frequency:
 * - **monthly**: next occurrence of `dueDay`. If today is past it this month, roll to next month.
 * - **weekly**: next occurrence from today (dueDay treated as day-of-week anchor, 1=Mon).
 * - **biweekly**: same as weekly but 14-day interval from anchor.
 * - **semi_monthly**: next of dueDay or dueDay+15 (capped at 28).
 * - **quarterly**: next quarter that contains dueDay in the relevant month.
 * - **annual**: next occurrence of dueMonth/dueDay.
 *
 * Returns null if dueDay is missing (can't compute).
 */
export function getNextDueDate(
  expense: RecurringExpenseForDueDate,
  now: Date = new Date(),
): Date | null {
  const { frequency, dueDay, dueMonth } = expense;

  if (dueDay === null || dueDay === undefined) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (frequency) {
    case "monthly":
      return nextMonthlyDate(today, dueDay);

    case "weekly":
      return nextWeeklyDate(today, dueDay);

    case "biweekly":
      return nextBiweeklyDate(today, dueDay);

    case "semi_monthly":
      return nextSemiMonthlyDate(today, dueDay);

    case "quarterly":
      return nextQuarterlyDate(today, dueDay, dueMonth);

    case "annual":
      return nextAnnualDate(today, dueDay, dueMonth);

    default:
      return null;
  }
}

// ─── Internal Helpers ────────────────────────────────────

/** Clamp day to the last valid day of a given month/year */
function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function nextMonthlyDate(today: Date, dueDay: number): Date {
  const y = today.getFullYear();
  const m = today.getMonth();
  const clamped = clampDay(y, m, dueDay);
  const candidate = new Date(y, m, clamped);

  if (candidate >= today) return candidate;

  // Roll to next month
  const nextM = m + 1;
  const nextY = nextM > 11 ? y + 1 : y;
  const adjM = nextM % 12;
  return new Date(nextY, adjM, clampDay(nextY, adjM, dueDay));
}

function nextWeeklyDate(today: Date, dueDay: number): Date {
  // dueDay 1-7 maps to Monday-Sunday (ISO style)
  // JS getDay: 0=Sun, 1=Mon ... 6=Sat
  const targetDow = dueDay % 7; // convert: 1=Mon→1, 7=Sun→0
  const todayDow = today.getDay();
  let daysAhead = targetDow - todayDow;
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0) return new Date(today); // today is the day
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysAhead);
}

function nextBiweeklyDate(today: Date, dueDay: number): Date {
  // Use dueDay as a day-of-month anchor. Find the next occurrence that's
  // on or after today, stepping 14 days at a time from an anchor.
  const y = today.getFullYear();
  const m = today.getMonth();
  const clamped = clampDay(y, m, dueDay);

  // Start from this month's anchor
  let anchor = new Date(y, m, clamped);

  // Walk backwards to find the most recent past anchor, then step forward
  while (anchor > today) {
    anchor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 14);
  }

  // Now step forward in 14-day increments until we're on or after today
  while (anchor < today) {
    anchor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 14);
  }

  return anchor;
}

function nextSemiMonthlyDate(today: Date, dueDay: number): Date {
  const y = today.getFullYear();
  const m = today.getMonth();

  // Two payment dates per month: dueDay and dueDay + 15 (capped at 28)
  const firstDay = clampDay(y, m, dueDay);
  const secondDay = clampDay(y, m, Math.min(dueDay + 15, 28));

  const first = new Date(y, m, firstDay);
  const second = new Date(y, m, secondDay);

  if (first >= today) return first;
  if (second >= today) return second;

  // Roll to next month
  const nextM = m + 1;
  const nextY = nextM > 11 ? y + 1 : y;
  const adjM = nextM % 12;
  return new Date(nextY, adjM, clampDay(nextY, adjM, dueDay));
}

function nextQuarterlyDate(
  today: Date,
  dueDay: number,
  dueMonth: number | null,
): Date {
  const y = today.getFullYear();

  // Quarter start months (0-indexed): 0=Jan, 3=Apr, 6=Jul, 9=Oct
  // If dueMonth provided (1-12), use that as the base month for quarterly cycle
  const baseMonth = dueMonth ? dueMonth - 1 : 0;
  const quarterMonths = [
    baseMonth % 12,
    (baseMonth + 3) % 12,
    (baseMonth + 6) % 12,
    (baseMonth + 9) % 12,
  ].sort((a, b) => a - b);

  // Check this year and next year
  for (const yearOffset of [0, 1]) {
    const yr = y + yearOffset;
    for (const qm of quarterMonths) {
      const clamped = clampDay(yr, qm, dueDay);
      const candidate = new Date(yr, qm, clamped);
      if (candidate >= today) return candidate;
    }
  }

  // Fallback (should never reach here)
  return new Date(y + 1, quarterMonths[0], dueDay);
}

function nextAnnualDate(
  today: Date,
  dueDay: number,
  dueMonth: number | null,
): Date {
  const month = (dueMonth ?? 1) - 1; // Convert 1-indexed to 0-indexed, default January
  const y = today.getFullYear();
  const clamped = clampDay(y, month, dueDay);
  const candidate = new Date(y, month, clamped);

  if (candidate >= today) return candidate;

  // Next year
  const nextClamped = clampDay(y + 1, month, dueDay);
  return new Date(y + 1, month, nextClamped);
}

// ─── Display Helpers ─────────────────────────────────────

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  semi_monthly: "Twice Monthly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

export function frequencyLabel(frequency: Frequency): string {
  return FREQUENCY_LABELS[frequency] ?? frequency;
}

/** Human-readable due date description, e.g. "15th of each month" */
export function dueDateDescription(
  frequency: Frequency,
  dueDay: number | null,
  dueMonth: number | null,
): string {
  if (dueDay === null) return "No due date set";

  const dayStr = ordinal(dueDay);

  switch (frequency) {
    case "weekly":
      return `Every week`;
    case "biweekly":
      return `Every 2 weeks`;
    case "semi_monthly":
      return `${dayStr} & ${ordinal(Math.min(dueDay + 15, 28))} of each month`;
    case "monthly":
      return `${dayStr} of each month`;
    case "quarterly": {
      const monthName = dueMonth
        ? new Date(2000, dueMonth - 1, 1).toLocaleString("en-US", { month: "short" })
        : "Jan";
      return `${dayStr} every quarter (from ${monthName})`;
    }
    case "annual": {
      const monthName = dueMonth
        ? new Date(2000, dueMonth - 1, 1).toLocaleString("en-US", { month: "long" })
        : "January";
      return `${monthName} ${dayStr}`;
    }
    default:
      return `${dayStr}`;
  }
}

/** Format date as short readable string */
export function formatDueDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Days until a date from now */
export function daysUntil(date: Date, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Ordinal Suffix ──────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
