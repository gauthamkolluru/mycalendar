import { describe, expect, it } from "vitest";
import {
  MAX_TASK_LENGTH,
  MAX_TASKS_PER_DAY,
  parseYearMonth,
  validateIsoDate,
  validateTaskText,
} from "../lib/validate.js";

describe("validateIsoDate", () => {
  it("accepts real calendar days", () => {
    expect(validateIsoDate("2025-10-31")).toEqual({
      ok: true,
      year: 2025,
      month: 10,
      day: 31,
    });
    expect(validateIsoDate("2024-02-29").ok).toBe(true);
  });

  it("rejects malformed, impossible, and overflowing dates", () => {
    expect(validateIsoDate("").ok).toBe(false);
    expect(validateIsoDate("2025-10-32").ok).toBe(false);
    expect(validateIsoDate("2025-02-29").ok).toBe(false);
    expect(validateIsoDate("2025/10/31").ok).toBe(false);
    expect(validateIsoDate("2025-1-1").ok).toBe(false);
  });
});

describe("validateTaskText", () => {
  it("trims ordinary notes", () => {
    expect(validateTaskText("  buy milk ")).toEqual({
      ok: true,
      text: "buy milk",
    });
  });

  it("rejects empty, oversized, and non-string notes", () => {
    expect(validateTaskText("").ok).toBe(false);
    expect(validateTaskText("   ").ok).toBe(false);
    expect(validateTaskText(null).ok).toBe(false);
    expect(validateTaskText("x".repeat(MAX_TASK_LENGTH + 1)).ok).toBe(false);
    expect(validateTaskText("x".repeat(MAX_TASK_LENGTH)).ok).toBe(true);
  });

  it("keeps markup as plain text instead of interpreting it", () => {
    const payload = "<script>alert(1)</script>";
    expect(validateTaskText(payload)).toEqual({ ok: true, text: payload });
  });
});

describe("parseYearMonth", () => {
  it("parses YYYY-MM and rejects junk", () => {
    expect(parseYearMonth("2025-10")).toEqual({
      ok: true,
      year: 2025,
      month: 10,
    });
    expect(parseYearMonth("2025-13").ok).toBe(false);
    expect(parseYearMonth("10-2025").ok).toBe(false);
  });
});

describe("limits", () => {
  it("caps how many notes a day can hold", () => {
    expect(MAX_TASKS_PER_DAY).toBe(12);
  });
});
