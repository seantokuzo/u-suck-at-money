import { describe, it, expect } from "vitest";
import { formatCents, parseCents, formatDate, currentMonth, cn } from "../utils";

// ─── formatCents ────────────────────────────────────────

describe("formatCents", () => {
  it("formats positive cents to dollar string", () => {
    expect(formatCents(4250)).toBe("$42.50");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats negative cents", () => {
    expect(formatCents(-1500)).toBe("-$15.00");
  });

  it("formats large amounts with comma separators", () => {
    expect(formatCents(1000000)).toBe("$10,000.00");
  });

  it("formats single cent", () => {
    expect(formatCents(1)).toBe("$0.01");
  });

  it("formats 99 cents", () => {
    expect(formatCents(99)).toBe("$0.99");
  });
});

// ─── parseCents ─────────────────────────────────────────

describe("parseCents", () => {
  it("parses dollar string to cents", () => {
    expect(parseCents("$42.50")).toBe(4250);
  });

  it("parses number to cents", () => {
    expect(parseCents(42.5)).toBe(4250);
  });

  it("parses plain string without dollar sign", () => {
    expect(parseCents("42.50")).toBe(4250);
  });

  it("handles zero", () => {
    expect(parseCents(0)).toBe(0);
    expect(parseCents("0")).toBe(0);
  });

  it("handles negative values", () => {
    expect(parseCents("-15.00")).toBe(-1500);
  });

  it("rounds fractional cents", () => {
    expect(parseCents(42.555)).toBe(4256);
  });

  it("strips commas and currency symbols", () => {
    expect(parseCents("$1,234.56")).toBe(123456);
  });
});

// ─── formatDate ─────────────────────────────────────────

describe("formatDate", () => {
  it("formats ISO date string to readable format", () => {
    // Use T12:00:00 to avoid UTC-to-local timezone day shift
    const result = formatDate("2024-03-15T12:00:00");
    expect(result).toContain("Mar");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats another date", () => {
    const result = formatDate("2025-12-01T12:00:00");
    expect(result).toContain("Dec");
    expect(result).toContain("2025");
  });
});

// ─── currentMonth ───────────────────────────────────────

describe("currentMonth", () => {
  it("returns YYYY-MM format", () => {
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });

  it("pads single-digit months with leading zero", () => {
    const month = currentMonth().split("-")[1];
    expect(month).toHaveLength(2);
  });
});

// ─── cn ─────────────────────────────────────────────────

describe("cn", () => {
  it("joins class names with spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out undefined, null, and false", () => {
    expect(cn("a", undefined, "b", null, false, "c")).toBe("a b c");
  });

  it("returns empty string when called with no args", () => {
    expect(cn()).toBe("");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  it("handles single class", () => {
    expect(cn("solo")).toBe("solo");
  });
});
