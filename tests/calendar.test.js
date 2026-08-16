import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  holidayName,
  isoDate,
  pad2,
  todayParts,
} from "../lib/calendar.js";

describe("buildMonthGrid", () => {
  it("builds October 2025 as a Sunday-start desk page", () => {
    const grid = buildMonthGrid(2025, 10);
    expect(grid).toHaveLength(35);
    expect(grid[0]).toEqual({
      year: 2025,
      month: 9,
      day: 28,
      inMonth: false,
      iso: "2025-09-28",
    });
    expect(grid[3]).toEqual({
      year: 2025,
      month: 10,
      day: 1,
      inMonth: true,
      iso: "2025-10-01",
    });
    expect(grid.at(-1)).toEqual({
      year: 2025,
      month: 11,
      day: 1,
      inMonth: false,
      iso: "2025-11-01",
    });
  });

  it("keeps February 2024 leap day inside the month", () => {
    const grid = buildMonthGrid(2024, 2);
    const leap = grid.find((cell) => cell.iso === "2024-02-29");
    expect(leap).toMatchObject({ inMonth: true, day: 29 });
  });

  it("does not invent February 29 on a common year", () => {
    const grid = buildMonthGrid(2025, 2);
    expect(grid.some((cell) => cell.iso === "2025-02-29")).toBe(false);
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(28);
  });

  it("starts a Sunday-first month on day 1", () => {
    const grid = buildMonthGrid(2026, 2);
    expect(grid[0]).toMatchObject({
      year: 2026,
      month: 2,
      day: 1,
      inMonth: true,
    });
  });
});

describe("calendar helpers", () => {
  it("formats local ISO dates with padded month and day", () => {
    expect(isoDate(2026, 8, 16)).toBe("2026-08-16");
    expect(pad2(3)).toBe("03");
  });

  it("reads today from the given clock, not UTC", () => {
    const winter = new Date(2026, 0, 1, 23, 30, 0);
    expect(todayParts(winter)).toEqual({ year: 2026, month: 1, day: 1 });
  });
});

describe("holidayName", () => {
  it("labels printed US observances used on a desk calendar", () => {
    expect(holidayName("2025-10-13")).toBe(
      "Columbus Day / Indigenous Peoples' Day",
    );
    expect(holidayName("2025-10-31")).toBe("Halloween");
    expect(holidayName("2025-04-20")).toBe("Easter");
    expect(holidayName("2025-11-27")).toBe("Thanksgiving");
    expect(holidayName("2025-01-20")).toBe("Martin Luther King Jr. Day");
  });

  it("returns empty string for ordinary days and invalid input", () => {
    expect(holidayName("2025-10-14")).toBe("");
    expect(holidayName("not-a-date")).toBe("");
    expect(holidayName("2025-13-01")).toBe("");
  });
});
