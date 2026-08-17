import { afterEach, describe, expect, it, vi } from "vitest";
import { reminderStorageKey } from "../lib/reminders.js";
import { createDayReminders } from "../src/reminders.js";

describe("createDayReminders", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("notifies once after 11:00 Eastern when the day has notes", async () => {
    const storage = memoryStorage();
    const notify = vi.fn();
    const timers = [];
    const api = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: {
        tasks: {
          "2026-01-15": [{ id: "1", text: "Dentist", date: "2026-01-15" }],
        },
      },
    }));

    // 11:05 EST
    let now = new Date("2026-01-15T16:05:00.000Z");
    const reminders = createDayReminders({
      api,
      storage,
      notify,
      permission: () => "granted",
      clock: () => now,
      setTimer: (fn, ms) => {
        const id = timers.length + 1;
        timers.push({ id, fn, ms });
        return id;
      },
      clearTimer: (id) => {
        const index = timers.findIndex((timer) => timer.id === id);
        if (index >= 0) timers.splice(index, 1);
      },
    });

    reminders.start({ id: "gautham", name: "Gautham" });
    await flush();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({
      title: "Today on your calendar",
      body: "Dentist",
      tag: "calendar-day-2026-01-15",
    });
    expect(storage.getItem(reminderStorageKey("gautham", "2026-01-15"))).toBe(
      "1",
    );

    reminders.start({ id: "gautham", name: "Gautham" });
    await flush();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("waits until 11:00 Eastern before notifying", async () => {
    const notify = vi.fn();
    const timers = [];
    const api = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: {
        tasks: {
          "2026-07-15": [{ id: "1", text: "Swim", date: "2026-07-15" }],
        },
      },
    }));

    // 10:00 EDT
    let now = new Date("2026-07-15T14:00:00.000Z");
    const reminders = createDayReminders({
      api,
      storage: memoryStorage(),
      notify,
      permission: () => "granted",
      clock: () => now,
      setTimer: (fn, ms) => {
        const id = timers.length + 1;
        timers.push({ id, fn, ms });
        return id;
      },
      clearTimer: (id) => {
        const index = timers.findIndex((timer) => timer.id === id);
        if (index >= 0) timers.splice(index, 1);
      },
    });

    reminders.start({ id: "wife", name: "Wife" });
    await flush();
    expect(notify).not.toHaveBeenCalled();
    expect(timers).toHaveLength(1);
    expect(timers[0].ms).toBe(60 * 60 * 1000);

    now = new Date("2026-07-15T15:00:00.000Z");
    const due = timers[0];
    timers.length = 0;
    due.fn();
    await flush();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].body).toBe("Swim");
  });
});

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}
