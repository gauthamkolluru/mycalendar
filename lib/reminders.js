const EASTERN = "America/New_York";
const REMINDER_HOUR = 11;

export function easternParts(now = new Date()) {
  return zonedParts(now, EASTERN);
}

export function todayIsoEastern(now = new Date()) {
  const parts = easternParts(now);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function isAtOrAfterElevenEastern(now = new Date()) {
  const parts = easternParts(now);
  return parts.hour > REMINDER_HOUR || parts.hour === REMINDER_HOUR;
}

/** UTC instant for 11:00 on the Eastern calendar date of `now`. */
export function elevenEasternOn(now = new Date()) {
  const parts = easternParts(now);
  return zonedTimeToUtc(
    parts.year,
    parts.month,
    parts.day,
    REMINDER_HOUR,
    0,
    EASTERN,
  );
}

/** Milliseconds until the next 11:00 America/New_York (DST-aware). */
export function msUntilNextElevenEastern(now = new Date()) {
  const todayEleven = elevenEasternOn(now);
  if (now.getTime() < todayEleven.getTime()) {
    return todayEleven.getTime() - now.getTime();
  }
  const parts = easternParts(now);
  const next = addCalendarDays(parts.year, parts.month, parts.day, 1);
  const tomorrowEleven = zonedTimeToUtc(
    next.year,
    next.month,
    next.day,
    REMINDER_HOUR,
    0,
    EASTERN,
  );
  return tomorrowEleven.getTime() - now.getTime();
}

export function reminderLines(tasks = [], holiday = "") {
  const lines = [];
  if (holiday) lines.push(holiday);
  for (const task of tasks) {
    if (task && typeof task === "object" && task.done) continue;
    const text = typeof task === "string" ? task : task?.text;
    if (typeof text === "string" && text.trim()) lines.push(text.trim());
  }
  return lines;
}

export function hasReminderEvents(tasks = [], holiday = "") {
  return reminderLines(tasks, holiday).length > 0;
}

export function reminderBody(tasks = [], holiday = "") {
  return reminderLines(tasks, holiday).join("\n");
}

export function reminderStorageKey(userId, isoDate) {
  return `calendar-reminder:${userId}:${isoDate}`;
}

export function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC Date.
 * Iteratively corrects for the zone offset (including DST).
 */
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = zonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = target - asUtc;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

function addCalendarDays(year, month, day, delta) {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}
