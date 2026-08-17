const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const WEEKDAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function monthTitle(month) {
  return MONTHS[month - 1] || "";
}

export function weekdayLabels() {
  return WEEKDAYS;
}

export function monthNavDelta(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return 0;
  if (isEditableTarget(event.target)) return 0;
  if (event.key === "ArrowRight") return 1;
  if (event.key === "ArrowLeft") return -1;
  return 0;
}

function isEditableTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.isContentEditable);
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (response.status === 204) return { ok: true, status: 204, body: null };
  const body = await readBody(response);
  return { ok: response.ok, status: response.status, body };
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Unexpected response." };
  }
}

export function errorMessage(result, fallback) {
  if (result.body && typeof result.body.error === "string") return result.body.error;
  return fallback;
}
