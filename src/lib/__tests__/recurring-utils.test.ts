import { describe, it, expect } from "vitest";
import {
  toMonthlyCents,
  toAnnualCents,
  getNextDueDate,
  daysUntil,
  dueDateDescription,
  frequencyLabel,
} from "../recurring-utils";

// Fixed reference date: Wednesday, January 15, 2025
const NOW = new Date(2025, 0, 15);

// ─── toMonthlyCents ─────────────────────────────────────

describe("toMonthlyCents", () => {
  it("monthly: returns same amount", () => {
    expect(toMonthlyCents(10000, "monthly")).toBe(10000);
  });

  it("weekly: multiplies by 52/12", () => {
    expect(toMonthlyCents(10000, "weekly")).toBe(Math.round(10000 * (52 / 12)));
  });

  it("biweekly: multiplies by 26/12", () => {
    expect(toMonthlyCents(10000, "biweekly")).toBe(Math.round(10000 * (26 / 12)));
  });

  it("semi_monthly: doubles the amount", () => {
    expect(toMonthlyCents(10000, "semi_monthly")).toBe(20000);
  });

  it("quarterly: divides by 3", () => {
    expect(toMonthlyCents(30000, "quarterly")).toBe(10000);
  });

  it("annual: divides by 12", () => {
    expect(toMonthlyCents(120000, "annual")).toBe(10000);
  });
});

// ─── toAnnualCents ──────────────────────────────────────

describe("toAnnualCents", () => {
  it("monthly: multiplies by 12", () => {
    expect(toAnnualCents(10000, "monthly")).toBe(120000);
  });

  it("weekly: multiplies monthly equivalent by 12", () => {
    // toAnnualCents goes through toMonthlyCents first, so intermediate rounding applies
    const monthlyEquiv = Math.round(10000 * (52 / 12));
    expect(toAnnualCents(10000, "weekly")).toBe(Math.round(monthlyEquiv * 12));
  });

  it("annual: returns same amount", () => {
    expect(toAnnualCents(120000, "annual")).toBe(120000);
  });

  it("quarterly: multiplies by 4", () => {
    expect(toAnnualCents(30000, "quarterly")).toBe(120000);
  });
});

// ─── getNextDueDate ─────────────────────────────────────

describe("getNextDueDate", () => {
  it("returns null when dueDay is null", () => {
    expect(getNextDueDate({ frequency: "monthly", dueDay: null, dueMonth: null }, NOW)).toBeNull();
  });

  // ── Monthly ──
  describe("monthly", () => {
    it("returns today when dueDay matches", () => {
      const result = getNextDueDate({ frequency: "monthly", dueDay: 15, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 0, 15));
    });

    it("returns later this month when dueDay is ahead", () => {
      const result = getNextDueDate({ frequency: "monthly", dueDay: 20, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 0, 20));
    });

    it("rolls to next month when dueDay has passed", () => {
      const result = getNextDueDate({ frequency: "monthly", dueDay: 10, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 1, 10));
    });

    it("clamps to last day of month (e.g., Feb 28)", () => {
      const jan31 = new Date(2025, 0, 31);
      const result = getNextDueDate({ frequency: "monthly", dueDay: 31, dueMonth: null }, jan31);
      // Jan 31 >= Jan 31, so it returns Jan 31
      expect(result).toEqual(new Date(2025, 0, 31));
    });
  });

  // ── Weekly ──
  describe("weekly", () => {
    it("returns today when it matches the target day", () => {
      // Jan 15, 2025 is Wednesday (getDay()=3), dueDay=3 → targetDow=3
      const result = getNextDueDate({ frequency: "weekly", dueDay: 3, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 0, 15));
    });

    it("returns next occurrence when target day is ahead", () => {
      // dueDay=5 (Friday) → targetDow=5, todayDow=3, ahead by 2
      const result = getNextDueDate({ frequency: "weekly", dueDay: 5, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 0, 17));
    });

    it("wraps to next week when target day has passed", () => {
      // dueDay=1 (Monday) → targetDow=1, todayDow=3, daysAhead=-2+7=5
      const result = getNextDueDate({ frequency: "weekly", dueDay: 1, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 0, 20));
    });
  });

  // ── Biweekly ──
  describe("biweekly", () => {
    it("returns today when anchor date matches", () => {
      const result = getNextDueDate({ frequency: "biweekly", dueDay: 15, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 0, 15));
    });

    it("returns next 14-day interval", () => {
      const result = getNextDueDate({ frequency: "biweekly", dueDay: 5, dueMonth: null }, NOW);
      // Anchor Jan 5, +14 = Jan 19
      expect(result).toEqual(new Date(2025, 0, 19));
    });
  });

  // ── Semi-Monthly ──
  describe("semi_monthly", () => {
    it("returns first date when it's still ahead", () => {
      const jan1 = new Date(2025, 0, 1);
      const result = getNextDueDate({ frequency: "semi_monthly", dueDay: 5, dueMonth: null }, jan1);
      expect(result).toEqual(new Date(2025, 0, 5));
    });

    it("returns second date when first has passed", () => {
      // dueDay=5, second date = 20th, today is Jan 15
      const result = getNextDueDate({ frequency: "semi_monthly", dueDay: 5, dueMonth: null }, NOW);
      expect(result).toEqual(new Date(2025, 0, 20));
    });

    it("rolls to next month when both dates have passed", () => {
      const jan25 = new Date(2025, 0, 25);
      const result = getNextDueDate({ frequency: "semi_monthly", dueDay: 5, dueMonth: null }, jan25);
      expect(result).toEqual(new Date(2025, 1, 5));
    });
  });

  // ── Quarterly ──
  describe("quarterly", () => {
    it("returns current quarter date when still ahead", () => {
      const result = getNextDueDate({ frequency: "quarterly", dueDay: 15, dueMonth: 1 }, NOW);
      expect(result).toEqual(new Date(2025, 0, 15));
    });

    it("returns next quarter when current has passed", () => {
      const result = getNextDueDate({ frequency: "quarterly", dueDay: 10, dueMonth: 1 }, NOW);
      // Jan 10 passed, next is Apr 10
      expect(result).toEqual(new Date(2025, 3, 10));
    });
  });

  // ── Annual ──
  describe("annual", () => {
    it("returns this year when date is still ahead", () => {
      const result = getNextDueDate({ frequency: "annual", dueDay: 15, dueMonth: 6 }, NOW);
      expect(result).toEqual(new Date(2025, 5, 15));
    });

    it("returns next year when date has passed", () => {
      const result = getNextDueDate({ frequency: "annual", dueDay: 10, dueMonth: 1 }, NOW);
      // Jan 10 passed → Jan 10 next year
      expect(result).toEqual(new Date(2026, 0, 10));
    });

    it("returns today when date matches", () => {
      const result = getNextDueDate({ frequency: "annual", dueDay: 15, dueMonth: 1 }, NOW);
      expect(result).toEqual(new Date(2025, 0, 15));
    });
  });
});

// ─── daysUntil ──────────────────────────────────────────

describe("daysUntil", () => {
  it("returns positive days for future date", () => {
    expect(daysUntil(new Date(2025, 0, 20), NOW)).toBe(5);
  });

  it("returns 0 for today", () => {
    expect(daysUntil(new Date(2025, 0, 15), NOW)).toBe(0);
  });

  it("returns negative days for past date", () => {
    expect(daysUntil(new Date(2025, 0, 10), NOW)).toBe(-5);
  });
});

// ─── frequencyLabel ─────────────────────────────────────

describe("frequencyLabel", () => {
  it("weekly → Weekly", () => {
    expect(frequencyLabel("weekly")).toBe("Weekly");
  });

  it("biweekly → Every 2 Weeks", () => {
    expect(frequencyLabel("biweekly")).toBe("Every 2 Weeks");
  });

  it("semi_monthly → Twice Monthly", () => {
    expect(frequencyLabel("semi_monthly")).toBe("Twice Monthly");
  });

  it("monthly → Monthly", () => {
    expect(frequencyLabel("monthly")).toBe("Monthly");
  });

  it("quarterly → Quarterly", () => {
    expect(frequencyLabel("quarterly")).toBe("Quarterly");
  });

  it("annual → Annual", () => {
    expect(frequencyLabel("annual")).toBe("Annual");
  });
});

// ─── dueDateDescription ─────────────────────────────────

describe("dueDateDescription", () => {
  it("returns fallback when dueDay is null", () => {
    expect(dueDateDescription("monthly", null, null)).toBe("No due date set");
  });

  it("monthly: 15th of each month", () => {
    expect(dueDateDescription("monthly", 15, null)).toBe("15th of each month");
  });

  it("weekly: Every week", () => {
    expect(dueDateDescription("weekly", 1, null)).toBe("Every week");
  });

  it("biweekly: Every 2 weeks", () => {
    expect(dueDateDescription("biweekly", 1, null)).toBe("Every 2 weeks");
  });

  it("semi_monthly: includes both dates", () => {
    const result = dueDateDescription("semi_monthly", 5, null);
    expect(result).toContain("5th");
    expect(result).toContain("20th");
  });

  it("quarterly: includes quarter info", () => {
    const result = dueDateDescription("quarterly", 15, 1);
    expect(result).toContain("15th");
    expect(result).toContain("quarter");
  });

  it("annual: includes month name", () => {
    const result = dueDateDescription("annual", 15, 6);
    expect(result).toContain("June");
    expect(result).toContain("15th");
  });
});
