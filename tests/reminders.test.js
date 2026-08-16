import { describe, expect, it } from "vitest";
import {
  elevenEasternOn,
  easternParts,
  hasReminderEvents,
  isAtOrAfterElevenEastern,
  msUntilNextElevenEastern,
  reminderBody,
  reminderLines,
  reminderStorageKey,
  todayIsoEastern,
  zonedTimeToUtc,
} from "../lib/reminders.js";

describe("eastern time helpers", () => {
  it("reads the America/New_York calendar date and clock", () => {
    // 2026-01-15 16:00 UTC = 11:00 EST
    const atElevenEst = new Date("2026-01-15T16:00:00.000Z");
    expect(easternParts(atElevenEst)).toMatchObject({
      year: 2026,
      month: 1,
      day: 15,
      hour: 11,
      minute: 0,
    });
    expect(todayIsoEastern(atElevenEst)).toBe("2026-01-15");
    expect(isAtOrAfterElevenEastern(atElevenEst)).toBe(true);
  });

  it("treats 11:00 EDT as 15:00 UTC in summer", () => {
    // 2026-07-15 15:00 UTC = 11:00 EDT
    const atElevenEdt = new Date("2026-07-15T15:00:00.000Z");
    expect(easternParts(atElevenEdt)).toMatchObject({
      year: 2026,
      month: 7,
      day: 15,
      hour: 11,
      minute: 0,
    });
    expect(elevenEasternOn(atElevenEdt).toISOString()).toBe(
      "2026-07-15T15:00:00.000Z",
    );
  });

  it("maps winter 11:00 EST to 16:00 UTC", () => {
    const noonUtc = new Date("2026-01-15T12:00:00.000Z");
    expect(elevenEasternOn(noonUtc).toISOString()).toBe(
      "2026-01-15T16:00:00.000Z",
    );
  });

  it("counts down to the next 11:00 Eastern across DST", () => {
    const beforeWinter = new Date("2026-01-15T15:00:00.000Z"); // 10:00 EST
    expect(msUntilNextElevenEastern(beforeWinter)).toBe(60 * 60 * 1000);

    const afterWinter = new Date("2026-01-15T16:30:00.000Z"); // 11:30 EST
    const untilTomorrowWinter = msUntilNextElevenEastern(afterWinter);
    const tomorrowWinterEleven = new Date("2026-01-16T16:00:00.000Z");
    expect(untilTomorrowWinter).toBe(
      tomorrowWinterEleven.getTime() - afterWinter.getTime(),
    );

    const beforeSummer = new Date("2026-07-15T14:00:00.000Z"); // 10:00 EDT
    expect(msUntilNextElevenEastern(beforeSummer)).toBe(60 * 60 * 1000);

    const afterSummer = new Date("2026-07-15T15:30:00.000Z"); // 11:30 EDT
    const untilTomorrowSummer = msUntilNextElevenEastern(afterSummer);
    const tomorrowSummerEleven = new Date("2026-07-16T15:00:00.000Z");
    expect(untilTomorrowSummer).toBe(
      tomorrowSummerEleven.getTime() - afterSummer.getTime(),
    );
  });

  it("converts wall times near the spring-forward gap", () => {
    // 2026-03-08 02:00 local does not exist; 11:00 still lands on EDT.
    const eleven = zonedTimeToUtc(2026, 3, 8, 11, 0, "America/New_York");
    expect(eleven.toISOString()).toBe("2026-03-08T15:00:00.000Z");
    expect(isAtOrAfterElevenEastern(new Date("2026-03-08T14:59:00.000Z"))).toBe(
      false,
    );
    expect(isAtOrAfterElevenEastern(new Date("2026-03-08T15:00:00.000Z"))).toBe(
      true,
    );
  });
});

describe("reminder copy", () => {
  it("builds lines from notes and an optional holiday", () => {
    expect(
      reminderLines([{ text: "Dentist" }, { text: "  " }], "Thanksgiving"),
    ).toEqual(["Thanksgiving", "Dentist"]);
    expect(reminderBody([{ text: "Call" }], "")).toBe("Call");
    expect(hasReminderEvents([], "")).toBe(false);
    expect(hasReminderEvents([{ text: "x" }], "")).toBe(true);
    expect(hasReminderEvents([], "Easter")).toBe(true);
  });

  it("scopes the sent marker by user and date", () => {
    expect(reminderStorageKey("gautham", "2026-08-16")).toBe(
      "calendar-reminder:gautham:2026-08-16",
    );
  });
});
