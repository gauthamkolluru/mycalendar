export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function isoDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function todayParts(now = new Date()) {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function weekdaySundayFirst(year, month, day) {
  return new Date(year, month - 1, day).getDay();
}

export function shiftMonth(year, month, delta) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function buildMonthGrid(year, month) {
  const firstWeekday = weekdaySundayFirst(year, month, 1);
  const count = daysInMonth(year, month);
  const cells = [];
  const leading = firstWeekday;
  const previous = shiftMonth(year, month, -1);
  const previousCount = daysInMonth(previous.year, previous.month);

  for (let i = leading; i > 0; i -= 1) {
    const day = previousCount - i + 1;
    cells.push(cell(previous.year, previous.month, day, false));
  }

  for (let day = 1; day <= count; day += 1) {
    cells.push(cell(year, month, day, true));
  }

  const next = shiftMonth(year, month, 1);
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push(cell(next.year, next.month, nextDay, false));
    nextDay += 1;
  }
  return cells;
}

function cell(year, month, day, inMonth) {
  return { year, month, day, inMonth, iso: isoDate(year, month, day) };
}

export function holidayName(iso) {
  const parsed = parseIso(iso);
  if (!parsed) return "";
  const { year, month, day } = parsed;
  const key = `${pad2(month)}-${pad2(day)}`;
  const floating = floatingHolidays(year);
  if (floating[iso]) return floating[iso];
  return FIXED_HOLIDAYS[key] || "";
}

const FIXED_HOLIDAYS = {
  "01-01": "New Year's Day",
  "02-14": "Valentine's Day",
  "03-17": "St. Patrick's Day",
  "06-19": "Juneteenth",
  "07-04": "Independence Day",
  "10-31": "Halloween",
  "11-11": "Veterans Day",
  "12-24": "Christmas Eve",
  "12-25": "Christmas",
  "12-31": "New Year's Eve",
};

function floatingHolidays(year) {
  const easterDay = easter(year);
  const goodFriday = addDays(year, easterDay.month, easterDay.day, -2);
  return {
    [isoDate(year, 1, nthWeekday(year, 1, 1, 3))]: "Martin Luther King Jr. Day",
    [isoDate(year, 2, nthWeekday(year, 2, 1, 3))]: "Presidents' Day",
    [isoDate(year, easterDay.month, easterDay.day)]: "Easter",
    [isoDate(year, goodFriday.month, goodFriday.day)]: "Good Friday",
    [isoDate(year, 5, lastWeekday(year, 5, 1))]: "Memorial Day",
    [isoDate(year, 9, nthWeekday(year, 9, 1, 1))]: "Labor Day",
    [isoDate(year, 10, nthWeekday(year, 10, 1, 2))]:
      "Columbus Day / Indigenous Peoples' Day",
    [isoDate(year, 11, nthWeekday(year, 11, 4, 4))]: "Thanksgiving",
  };
}

function nthWeekday(year, month, weekday, n) {
  let count = 0;
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    if (weekdaySundayFirst(year, month, day) === weekday) {
      count += 1;
      if (count === n) return day;
    }
  }
  return 0;
}

function lastWeekday(year, month, weekday) {
  for (let day = daysInMonth(year, month); day >= 1; day -= 1) {
    if (weekdaySundayFirst(year, month, day) === weekday) return day;
  }
  return 0;
}

function addDays(year, month, day, delta) {
  const date = new Date(year, month - 1, day + delta);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function parseIso(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}
