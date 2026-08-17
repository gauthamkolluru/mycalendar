import { USER_IDS } from "./auth.js";

export function memoryBlobStore(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    async get(key, options = {}) {
      if (!map.has(key)) return null;
      const value = map.get(key);
      return options.type === "json" ? value : JSON.stringify(value);
    },
    async setJSON(key, value) {
      map.set(key, value);
    },
  };
}

export function monthKey(userId, yearMonth) {
  if (!USER_IDS.includes(userId)) throw new Error("Unknown user.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error("Invalid month.");
  return `user:${userId}:${yearMonth}`;
}

export async function readMonth(blobStore, userId, yearMonth) {
  const key = monthKey(userId, yearMonth);
  const data = await blobStore.get(key, { type: "json" });
  if (data && Array.isArray(data.tasks)) return data.tasks.filter(isTask);
  if (userId === "gautham") {
    const legacy = await blobStore.get(yearMonth, { type: "json" });
    if (legacy && Array.isArray(legacy.tasks)) return legacy.tasks.filter(isTask);
  }
  return [];
}

export async function writeMonth(blobStore, userId, yearMonth, tasks) {
  await blobStore.setJSON(monthKey(userId, yearMonth), { tasks });
}

function isTask(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.text === "string" &&
    (value.done === undefined || typeof value.done === "boolean")
  );
}
