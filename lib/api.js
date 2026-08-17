import { createHash, randomUUID } from "node:crypto";
import {
  clearSessionCookieHeader,
  matchUser,
  parseSessionCookie,
  SESSION_MS,
  sessionCookieHeader,
  signSession,
  verifySession,
} from "./auth.js";
import { logger } from "./logger.js";
import { memoryBlobStore, readMonth, writeMonth } from "./store.js";
import {
  MAX_TASKS_PER_DAY,
  parseYearMonth,
  validateIsoDate,
  validateTaskDone,
  validateTaskText,
} from "./validate.js";

export { memoryBlobStore };

const log = logger("api");
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function handleRequest(request, env, blobStore) {
  const cfg = readConfig(env);
  if (!cfg) {
    log.error("missing_config");
    return json(503, { error: "Calendar is not configured." });
  }

  const url = new URL(request.url);
  const path = routePath(url.pathname);
  const method = request.method.toUpperCase();

  try {
    if (path === "/api/session" && method === "GET") {
      const session = requireSession(request, cfg);
      return session
        ? json(200, { ok: true, user: publicUser(session) })
        : json(401, { error: "Sign in to open the calendar." });
    }
    if (path === "/api/session" && method === "POST") {
      return login(request, cfg, blobStore);
    }
    if (path === "/api/session" && method === "DELETE") {
      return logout(request);
    }
    if (path === "/api/tasks" && method === "GET") {
      return listTasks(request, url, cfg, blobStore);
    }
    if (path === "/api/tasks" && method === "POST") {
      return createTask(request, cfg, blobStore);
    }
    if (path === "/api/tasks" && method === "PATCH") {
      return updateTask(request, cfg, blobStore);
    }
    if (path === "/api/tasks" && method === "DELETE") {
      return removeTask(request, url, cfg, blobStore);
    }
    return json(404, { error: "Not found." });
  } catch (error) {
    log.error("unhandled", { path, method, err: error.message });
    return json(500, { error: "Something went wrong." });
  }
}

function readConfig(env) {
  const gauthamPassword = env.CALENDAR_GAUTHAM_PASSWORD || "";
  const wifePassword = env.CALENDAR_WIFE_PASSWORD || "";
  const secret = env.CALENDAR_SESSION_SECRET || "";
  if (!gauthamPassword || !wifePassword || secret.length < 32) return null;
  if (gauthamPassword === wifePassword) return null;
  return {
    secret,
    users: [
      { id: "gautham", name: "Gautham", password: gauthamPassword },
      { id: "wife", name: env.CALENDAR_WIFE_NAME || "Wife", password: wifePassword },
    ],
  };
}

function publicUser(user) {
  return { id: user.id, name: user.name };
}

function routePath(pathname) {
  let path = pathname;
  if (path.startsWith("/.netlify/functions/api")) {
    path = `/api${path.slice("/.netlify/functions/api".length)}`;
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

function requireSession(request, cfg) {
  const token = parseSessionCookie(request.headers.get("cookie") || "");
  const session = verifySession(cfg.secret, token);
  if (!session.ok) return null;
  return cfg.users.find((user) => user.id === session.userId) || null;
}

async function login(request, cfg, blobStore) {
  const ipKey = loginKey(request);
  if (await isLocked(blobStore, ipKey)) {
    log.warn("login_locked");
    return json(429, { error: "Too many attempts. Try again in a few minutes." });
  }
  const parsed = await readJson(request);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const password = parsed.value.password;
  const user = matchUser(cfg.users, password);
  if (!user) {
    await bumpLogin(blobStore, ipKey);
    log.warn("login_failed");
    return json(401, { error: "Wrong password." });
  }
  await blobStore.setJSON(ipKey, { count: 0, resetAt: 0 });
  const token = signSession(cfg.secret, user.id, Date.now() + SESSION_MS);
  log.info("login_ok", { user: user.id });
  return json(
    200,
    { ok: true, user: publicUser(user) },
    { "set-cookie": sessionCookieHeader(token, isSecure(request)) },
  );
}

function logout(request) {
  log.info("logout");
  return json(204, null, {
    "set-cookie": clearSessionCookieHeader(isSecure(request)),
  });
}

async function listTasks(request, url, cfg, blobStore) {
  const session = requireSession(request, cfg);
  if (!session) return json(401, { error: "Sign in to open the calendar." });
  const parsed = parseYearMonth(url.searchParams.get("month") || "");
  if (!parsed.ok) return json(400, { error: parsed.error });
  const yearMonth = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
  const tasks = await readMonth(blobStore, session.id, yearMonth);
  const grouped = {};
  for (const task of tasks) {
    if (!grouped[task.date]) grouped[task.date] = [];
    grouped[task.date].push(task);
  }
  return json(200, { month: yearMonth, tasks: grouped });
}

async function createTask(request, cfg, blobStore) {
  const session = requireSession(request, cfg);
  if (!session) return json(401, { error: "Sign in to open the calendar." });
  const parsed = await readJson(request);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const date = validateIsoDate(parsed.value.date);
  const text = validateTaskText(parsed.value.text);
  if (!date.ok) return json(400, { error: date.error });
  if (!text.ok) return json(400, { error: text.error });
  const yearMonth = parsed.value.date.slice(0, 7);
  const tasks = await readMonth(blobStore, session.id, yearMonth);
  const forDay = tasks.filter((task) => task.date === parsed.value.date);
  if (forDay.length >= MAX_TASKS_PER_DAY) {
    return json(409, { error: `That day is full (${MAX_TASKS_PER_DAY} notes).` });
  }
  const task = {
    id: randomUUID(),
    date: parsed.value.date,
    text: text.text,
    done: false,
  };
  tasks.push(task);
  await writeMonth(blobStore, session.id, yearMonth, tasks);
  log.info("task_created", { date: task.date, user: session.id });
  return json(201, { task });
}

async function updateTask(request, cfg, blobStore) {
  const session = requireSession(request, cfg);
  if (!session) return json(401, { error: "Sign in to open the calendar." });
  const parsed = await readJson(request);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const date = validateIsoDate(parsed.value.date);
  const id = typeof parsed.value.id === "string" ? parsed.value.id : "";
  if (!date.ok) return json(400, { error: date.error });
  if (!id) return json(400, { error: "Missing note id." });
  const hasText = Object.hasOwn(parsed.value, "text");
  const hasDone = Object.hasOwn(parsed.value, "done");
  if (!hasText && !hasDone) return json(400, { error: "Nothing to update." });
  let nextText;
  if (hasText) {
    const text = validateTaskText(parsed.value.text);
    if (!text.ok) return json(400, { error: text.error });
    nextText = text.text;
  }
  let nextDone;
  if (hasDone) {
    const done = validateTaskDone(parsed.value.done);
    if (!done.ok) return json(400, { error: done.error });
    nextDone = done.done;
  }
  const yearMonth = parsed.value.date.slice(0, 7);
  const tasks = await readMonth(blobStore, session.id, yearMonth);
  const index = tasks.findIndex(
    (task) => task.id === id && task.date === parsed.value.date,
  );
  if (index < 0) return json(404, { error: "Note not found." });
  const current = tasks[index];
  const task = {
    id: current.id,
    date: current.date,
    text: nextText ?? current.text,
    done: nextDone ?? current.done === true,
  };
  tasks[index] = task;
  await writeMonth(blobStore, session.id, yearMonth, tasks);
  log.info("task_updated", { date: task.date, user: session.id, done: task.done });
  return json(200, { task });
}

async function removeTask(request, url, cfg, blobStore) {
  const session = requireSession(request, cfg);
  if (!session) return json(401, { error: "Sign in to open the calendar." });
  const date = validateIsoDate(url.searchParams.get("date") || "");
  const id = url.searchParams.get("id") || "";
  if (!date.ok) return json(400, { error: date.error });
  if (!id) return json(400, { error: "Missing note id." });
  const yearMonth = url.searchParams.get("date").slice(0, 7);
  const tasks = await readMonth(blobStore, session.id, yearMonth);
  const next = tasks.filter((task) => task.id !== id);
  if (next.length === tasks.length) return json(404, { error: "Note not found." });
  await writeMonth(blobStore, session.id, yearMonth, next);
  log.info("task_deleted", { date: url.searchParams.get("date"), user: session.id });
  return new Response(null, { status: 204, headers: baseHeaders() });
}

function loginKey(request) {
  const ip =
    request.headers.get("x-nf-client-connection-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  return `_login:${hash}`;
}

async function isLocked(blobStore, key) {
  const data = await blobStore.get(key, { type: "json" });
  if (!data) return false;
  if (Number(data.resetAt) < Date.now()) return false;
  return Number(data.count) >= MAX_LOGIN_ATTEMPTS;
}

async function bumpLogin(blobStore, key) {
  const now = Date.now();
  const data = (await blobStore.get(key, { type: "json" })) || {};
  const resetAt = Number(data.resetAt) > now ? Number(data.resetAt) : now + LOGIN_WINDOW_MS;
  const count = Number(data.resetAt) > now ? Number(data.count) + 1 : 1;
  await blobStore.setJSON(key, { count, resetAt });
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 8192) return { ok: false, error: "Request is too large." };
  if (!text) return { ok: true, value: {} };
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "Invalid JSON." };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
}

function isSecure(request) {
  return new URL(request.url).protocol === "https:";
}

function json(status, body, extraHeaders = {}) {
  const headers = { ...baseHeaders(), ...extraHeaders };
  if (body === null) return new Response(null, { status, headers });
  headers["content-type"] = "application/json; charset=utf-8";
  return new Response(JSON.stringify(body), { status, headers });
}

function baseHeaders() {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
}
