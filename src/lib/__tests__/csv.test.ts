import { describe, it, expect } from "vitest";
import { toCsv } from "../csv";

describe("toCsv", () => {
  it("returns empty string for empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("generates headers from first row keys", () => {
    const rows = [{ name: "Alice", age: 30 }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,age");
  });

  it("generates correct data rows", () => {
    const rows = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Alice,30");
    expect(lines[2]).toBe("Bob,25");
  });

  it("handles null and undefined values as empty strings", () => {
    const rows = [{ a: null, b: undefined, c: "ok" }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe(",,ok");
  });

  it("escapes fields containing commas", () => {
    const rows = [{ desc: "hello, world" }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"hello, world"');
  });

  it("escapes fields containing double quotes", () => {
    const rows = [{ desc: 'she said "hi"' }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"she said ""hi"""');
  });

  it("escapes fields containing newlines", () => {
    const rows = [{ desc: "line1\nline2" }];
    const csv = toCsv(rows);
    expect(csv).toContain('"line1\nline2"');
  });

  it("handles mixed types (numbers, booleans, strings)", () => {
    const rows = [{ num: 42, flag: true, text: "hello" }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("42,true,hello");
  });

  it("sanitizes formula injection prefixes (=, +, -, @)", () => {
    const rows = [
      { desc: "=SUM(A1:A10)" },
      { desc: "+cmd|'/C calc'" },
      { desc: "-1+1" },
      { desc: "@SUM(A1)" },
    ];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("'=SUM(A1:A10)");
    expect(lines[2]).toBe("'+cmd|'/C calc'");
    expect(lines[3]).toBe("'-1+1");
    expect(lines[4]).toBe("'@SUM(A1)");
  });

  it("does not sanitize normal values", () => {
    const rows = [{ desc: "normal text" }, { desc: "123" }];
    const csv = toCsv(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("normal text");
    expect(lines[2]).toBe("123");
  });

  it("handles multiple rows with all edge cases", () => {
    const rows = [
      { id: 1, name: "Normal", notes: "" },
      { id: 2, name: "Has, comma", notes: null },
      { id: 3, name: 'Has "quotes"', notes: "fine" },
    ];
    const csv = toCsv(rows);
    expect(csv).toContain("id,name,notes");
    expect(csv).toContain('1,Normal,');
    expect(csv).toContain('"Has, comma"');
    expect(csv).toContain('"Has ""quotes"""');
  });
});
