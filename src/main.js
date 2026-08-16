import {
  buildMonthGrid,
  holidayName,
  isoDate,
  shiftMonth,
  todayParts,
} from "../lib/calendar.js";
import { logger } from "../lib/logger.js";
import {
  api,
  errorMessage,
  monthTitle,
  weekdayLabels,
} from "./client.js";
import "./styles.css";

const log = logger("ui");
const LOCK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const UNLOCK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.2-2.8"/></svg>';
const today = todayParts();
const state = {
  year: today.year,
  month: today.month,
  tasks: {},
  selected: null,
  authed: false,
  user: null,
  status: "",
};

const app = document.getElementById("app");

boot();

async function boot() {
  render();
  const session = await api("/api/session");
  state.authed = session.ok;
  state.user = session.ok ? session.body.user : null;
  if (session.status === 503) {
    state.status = errorMessage(session, "Calendar is not configured.");
  }
  if (state.authed) await loadMonth();
  render();
}

async function loadMonth() {
  const month = `${state.year}-${String(state.month).padStart(2, "0")}`;
  const result = await api(`/api/tasks?month=${month}`);
  if (result.status === 401) {
    state.authed = false;
    state.user = null;
    state.tasks = {};
    return;
  }
  if (!result.ok) {
    state.status = errorMessage(result, "Could not load notes.");
    log.warn("month_load_failed", { month, status: result.status });
    return;
  }
  state.tasks = result.body.tasks || {};
}

function render() {
  app.replaceChildren(sheet());
  if (!state.authed) app.append(loginDialog());
  if (state.selected && state.authed) app.append(noteDialog());
}

function sheet() {
  const root = document.createElement("div");
  root.className = "sheet";
  const weeks = buildMonthGrid(state.year, state.month).length / 7;
  root.style.setProperty("--weeks", String(weeks));
  root.append(header(), weekdays(), grid());
  if (state.status) root.append(statusLine(state.status));
  return root;
}

function header() {
  const headerEl = document.createElement("header");
  headerEl.className = "header";

  const monthWrap = document.createElement("div");
  monthWrap.className = "month-wrap";

  const prev = navButton("Previous month", "‹", -1);
  const next = navButton("Next month", "›", 1);
  const title = document.createElement("h1");
  title.className = "month";
  title.textContent = monthTitle(state.month);

  const year = document.createElement("p");
  year.className = "year";
  year.textContent = String(state.year);

  monthWrap.append(prev, title, year, next);
  headerEl.append(monthWrap, lockButton());
  return headerEl;
}

function lockButton() {
  const wrap = document.createElement("div");
  wrap.className = "lock-wrap";
  if (state.authed && state.user?.name) {
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = state.user.name;
    wrap.append(who);
  }
  const unlocked = state.authed;
  const action = unlocked ? "lock" : "unlock";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "lock";
  button.dataset.tip = action;
  button.setAttribute("aria-label", action);
  button.innerHTML = unlocked ? UNLOCK_ICON : LOCK_ICON;
  button.addEventListener("click", onLockClick);
  wrap.append(button);
  return wrap;
}

async function onLockClick() {
  if (!state.authed) {
    const input = document.getElementById("password");
    if (input) input.focus();
    return;
  }
  await api("/api/session", { method: "DELETE" });
  state.authed = false;
  state.user = null;
  state.tasks = {};
  state.selected = null;
  state.status = "";
  render();
}

function navButton(label, text, delta) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav";
  button.setAttribute("aria-label", label);
  button.textContent = text;
  button.addEventListener("click", async () => {
    const next = shiftMonth(state.year, state.month, delta);
    state.year = next.year;
    state.month = next.month;
    state.selected = null;
    state.status = "";
    if (state.authed) await loadMonth();
    render();
  });
  return button;
}

function weekdays() {
  const row = document.createElement("div");
  row.className = "weekdays";
  for (const name of weekdayLabels()) {
    const label = document.createElement("div");
    label.className = "weekday";
    const full = document.createElement("span");
    full.className = "full";
    full.textContent = name;
    const short = document.createElement("span");
    short.className = "short";
    short.textContent = name.slice(0, 3);
    label.append(full, short);
    row.append(label);
  }
  return row;
}

function grid() {
  const gridEl = document.createElement("div");
  gridEl.className = "grid";
  const todayIso = isoDate(today.year, today.month, today.day);
  for (const cell of buildMonthGrid(state.year, state.month)) {
    gridEl.append(dayCell(cell, todayIso));
  }
  return gridEl;
}

function dayCell(cell, todayIso) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cell";
  if (!cell.inMonth) button.classList.add("outside");
  if (cell.iso === todayIso) button.classList.add("today");
  if (state.selected === cell.iso) button.classList.add("selected");
  button.setAttribute("aria-label", cell.iso);

  const number = document.createElement("span");
  number.className = "date";
  number.textContent = String(cell.day);

  const notes = document.createElement("span");
  notes.className = "notes";
  const holiday = holidayName(cell.iso);
  const tasks = state.tasks[cell.iso] || [];
  const lines = tasks.map((task) => task.text);
  if (holiday) lines.push(holiday);
  notes.textContent = lines.join("\n");

  button.append(number, notes);
  button.addEventListener("click", () => openDay(cell));
  return button;
}

async function openDay(cell) {
  if (!cell.inMonth) {
    state.year = cell.year;
    state.month = cell.month;
    if (state.authed) await loadMonth();
  }
  state.selected = cell.iso;
  if (!state.authed) {
    render();
    return;
  }
  render();
  const input = document.getElementById("note-input");
  if (input) input.focus();
}

function loginDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "panel";
  dialog.setAttribute("open", "");

  const form = document.createElement("form");
  form.addEventListener("submit", onLogin);

  const heading = document.createElement("h2");
  heading.textContent = "Open calendar";

  const label = document.createElement("label");
  label.setAttribute("for", "password");
  label.textContent = "Password";

  const input = document.createElement("input");
  input.id = "password";
  input.name = "password";
  input.type = "password";
  input.autocomplete = "current-password";
  input.required = true;

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Open";

  form.append(heading, label, input, submit);
  if (state.status) form.append(statusLine(state.status));
  dialog.append(form);
  return dialog;
}

async function onLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const password = new FormData(form).get("password");
  const result = await api("/api/session", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  if (!result.ok) {
    state.status = errorMessage(result, "Could not sign in.");
    log.warn("login_failed", { status: result.status });
    render();
    return;
  }
  state.authed = true;
  state.user = result.body.user || null;
  state.status = "";
  await loadMonth();
  render();
}

function noteDialog() {
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.addEventListener("click", (event) => {
    if (event.target === scrim) {
      state.selected = null;
      render();
    }
  });

  const dialog = document.createElement("div");
  dialog.className = "panel notes-panel";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "note-heading");

  const heading = document.createElement("h2");
  heading.id = "note-heading";
  heading.textContent = formatHeading(state.selected);

  const holiday = holidayName(state.selected);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "Close";
  close.addEventListener("click", () => {
    state.selected = null;
    render();
  });

  const list = document.createElement("ul");
  list.className = "note-list";
  const tasks = state.tasks[state.selected] || [];
  if (holiday) {
    const item = document.createElement("li");
    item.className = "holiday";
    item.textContent = holiday;
    list.append(item);
  }
  for (const task of tasks) {
    list.append(noteItem(task));
  }
  if (!holiday && tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No notes yet.";
    list.append(empty);
  }

  const form = document.createElement("form");
  form.addEventListener("submit", onAddNote);
  const input = document.createElement("input");
  input.id = "note-input";
  input.name = "text";
  input.maxLength = 280;
  input.placeholder = "Write a note";
  input.autocomplete = "off";
  const add = document.createElement("button");
  add.type = "submit";
  add.textContent = "Add";
  form.append(input, add);

  dialog.append(heading, close, list, form);
  if (state.status) dialog.append(statusLine(state.status));
  scrim.append(dialog);
  return scrim;
}

function noteItem(task) {
  const item = document.createElement("li");
  const text = document.createElement("span");
  text.textContent = task.text;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove";
  remove.setAttribute("aria-label", "Remove note");
  remove.textContent = "×";
  remove.addEventListener("click", () => onRemoveNote(task));
  item.append(text, remove);
  return item;
}

async function onAddNote(event) {
  event.preventDefault();
  const text = new FormData(event.currentTarget).get("text");
  const result = await api("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ date: state.selected, text }),
  });
  if (!result.ok) {
    state.status = errorMessage(result, "Could not save that note.");
    log.warn("task_create_failed", { status: result.status });
    render();
    return;
  }
  state.status = "";
  await loadMonth();
  render();
  const input = document.getElementById("note-input");
  if (input) input.focus();
}

async function onRemoveNote(task) {
  const result = await api(
    `/api/tasks?date=${encodeURIComponent(task.date)}&id=${encodeURIComponent(task.id)}`,
    { method: "DELETE" },
  );
  if (!result.ok) {
    state.status = errorMessage(result, "Could not remove that note.");
    log.warn("task_delete_failed", { status: result.status });
    render();
    return;
  }
  state.status = "";
  await loadMonth();
  render();
}

function formatHeading(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function statusLine(text) {
  const p = document.createElement("p");
  p.className = "status";
  p.textContent = text;
  return p;
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.selected) {
    state.selected = null;
    render();
  }
});
