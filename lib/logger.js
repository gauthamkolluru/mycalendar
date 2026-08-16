export function log(level, message, context = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else console.log(line);
}

export function logger(scope) {
  return {
    info(message, context) {
      log("info", message, { scope, ...context });
    },
    warn(message, context) {
      log("warn", message, { scope, ...context });
    },
    error(message, context) {
      log("error", message, { scope, ...context });
    },
  };
}
