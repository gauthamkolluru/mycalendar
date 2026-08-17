import { daysInMonth } from "./calendar.js";

// App policy so a day still reads like paper — not a Netlify quota.
export const MAX_TASK_LENGTH = 1000;
export const MAX_TASKS_PER_DAY = 24;

export function validateIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, error: "Date must be YYYY-MM-DD." };
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { ok: false, error: "That date does not exist." };
  }
  return { ok: true, year, month, day };
}

export function validateTaskText(value) {
  if (typeof value !== "string") {
    return { ok: false, error: "Note must be text." };
  }
  const text = value.trim();
  if (!text) return { ok: false, error: "Write a note first." };
  if (text.length > MAX_TASK_LENGTH) {
    return { ok: false, error: `Keep notes to ${MAX_TASK_LENGTH} characters.` };
  }
  return { ok: true, text };
}

export function validateTaskDone(value) {
  if (typeof value !== "boolean") {
    return { ok: false, error: "Done must be true or false." };
  }
  return { ok: true, done: value };
}

export function parseYearMonth(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return { ok: false, error: "Month must be YYYY-MM." };
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  if (month < 1 || month > 12) {
    return { ok: false, error: "Month must be between 01 and 12." };
  }
  return { ok: true, year, month };
}
