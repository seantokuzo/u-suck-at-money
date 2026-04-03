import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Dependencies ─────────────────────────────────

const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock("@/db", () => ({
  db: { insert: (...args: unknown[]) => mockInsert(...args) },
}));

vi.mock("@/db/schema", () => ({
  settings: { key: "settings.key" },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import AFTER mocks are set up
const { updateSetting } = await import("../settings");

// ─── Tests ──────────────────────────────────────────────

describe("updateSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for empty key", async () => {
    const result = await updateSetting("", "value");
    expect(result).toEqual({ error: "Setting key is required" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns error for whitespace-only key", async () => {
    const result = await updateSetting("   ", "value");
    expect(result).toEqual({ error: "Setting key is required" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("trims key whitespace before insert", async () => {
    await updateSetting("  theme  ", "dark");
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ key: "theme" }),
    );
  });

  it("calls insert with correct key and value", async () => {
    await updateSetting("currency", "USD");
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ key: "currency", value: "USD" }),
    );
  });

  it("configures onConflictDoUpdate for upsert", async () => {
    await updateSetting("currency", "USD");
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "settings.key",
        set: expect.objectContaining({ value: "USD" }),
      }),
    );
  });

  it("returns success on successful upsert", async () => {
    const result = await updateSetting("theme", "dark");
    expect(result).toEqual({ success: true });
  });

  it("returns error when db insert throws", async () => {
    mockOnConflictDoUpdate.mockRejectedValueOnce(new Error("DB down"));
    const result = await updateSetting("theme", "dark");
    expect(result).toEqual({ error: 'Failed to update setting "theme"' });
  });

  it("revalidates /settings path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    await updateSetting("theme", "dark");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("does not revalidate on error", async () => {
    const { revalidatePath } = await import("next/cache");
    vi.mocked(revalidatePath).mockClear();
    mockOnConflictDoUpdate.mockRejectedValueOnce(new Error("fail"));
    await updateSetting("theme", "dark");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("handles non-string values (objects, arrays, numbers)", async () => {
    await updateSetting("config", { nested: true });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ value: { nested: true } }),
    );
  });
});
