import { holidayName } from "../lib/calendar.js";
import { logger } from "../lib/logger.js";
import {
  hasReminderEvents,
  isAtOrAfterElevenEastern,
  msUntilNextElevenEastern,
  reminderBody,
  reminderStorageKey,
  todayIsoEastern,
} from "../lib/reminders.js";

const log = logger("reminders");
const MAX_TIMER_MS = 6 * 60 * 60 * 1000;

/**
 * Browser notifications for today's calendar events at 11:00 America/New_York.
 * Needs an open tab (or a catch-up when the page is opened after 11am ET).
 */
export function createDayReminders({
  api,
  storage = globalThis.localStorage,
  notify = defaultNotify,
  permission = () =>
    globalThis.Notification ? Notification.permission : "denied",
  requestPermission = () =>
    globalThis.Notification
      ? Notification.requestPermission()
      : Promise.resolve("denied"),
  clock = () => new Date(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
} = {}) {
  let userId = null;
  let timerId = null;
  let running = false;

  return {
    permission,
    async enable() {
      if (!globalThis.Notification) return "denied";
      if (permission() === "granted") return "granted";
      if (permission() === "denied") return "denied";
      return requestPermission();
    },
    start(user) {
      stopTimer();
      userId = user?.id || null;
      running = Boolean(userId);
      if (!running) return;
      void tick();
    },
    stop() {
      running = false;
      userId = null;
      stopTimer();
    },
    /** Re-check after notes change for today. */
    refresh() {
      if (!running || !userId) return;
      void tick({ skipScheduleOnly: false, catchUpOnly: true });
    },
  };

  function stopTimer() {
    if (timerId != null) {
      clearTimer(timerId);
      timerId = null;
    }
  }

  function scheduleNext() {
    stopTimer();
    if (!running) return;
    const delay = Math.max(250, Math.min(msUntilNextElevenEastern(clock()), MAX_TIMER_MS));
    timerId = setTimer(() => {
      void tick();
    }, delay);
  }

  async function tick({ catchUpOnly = false } = {}) {
    if (!running || !userId) return;
    const now = clock();
    const iso = todayIsoEastern(now);
    const due = isAtOrAfterElevenEastern(now);

    if (due && !wasSent(userId, iso)) {
      await maybeNotify(iso);
    }

    if (!catchUpOnly) scheduleNext();
    else if (!due) scheduleNext();
  }

  async function maybeNotify(iso) {
    if (permission() !== "granted") {
      log.info("permission_skipped", { iso });
      return;
    }
    const events = await loadDay(iso);
    if (!hasReminderEvents(events.tasks, events.holiday)) {
      log.info("no_events", { iso });
      return;
    }
    const body = reminderBody(events.tasks, events.holiday);
    try {
      notify({
        title: "Today on your calendar",
        body,
        tag: `calendar-day-${iso}`,
      });
      markSent(userId, iso);
      log.info("notified", { iso, lines: body.split("\n").length });
    } catch (error) {
      log.warn("notify_failed", { iso, err: error.message });
    }
  }

  async function loadDay(iso) {
    const month = iso.slice(0, 7);
    const result = await api(`/api/tasks?month=${month}`);
    if (!result.ok) {
      log.warn("load_failed", { iso, status: result.status });
      return { tasks: [], holiday: holidayName(iso) };
    }
    const tasks = result.body?.tasks?.[iso] || [];
    return { tasks, holiday: holidayName(iso) };
  }

  function wasSent(id, iso) {
    try {
      return storage.getItem(reminderStorageKey(id, iso)) === "1";
    } catch {
      return false;
    }
  }

  function markSent(id, iso) {
    try {
      storage.setItem(reminderStorageKey(id, iso), "1");
    } catch {
      /* ignore quota / private mode */
    }
  }
}

function defaultNotify({ title, body, tag }) {
  return new Notification(title, {
    body,
    tag,
    lang: "en",
  });
}
