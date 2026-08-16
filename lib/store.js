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

export async function readMonth(blobStore, yearMonth) {
  const data = await blobStore.get(yearMonth, { type: "json" });
  if (!data || !Array.isArray(data.tasks)) return [];
  return data.tasks.filter(isTask);
}

export async function writeMonth(blobStore, yearMonth, tasks) {
  await blobStore.setJSON(yearMonth, { tasks });
}

function isTask(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.text === "string"
  );
}
