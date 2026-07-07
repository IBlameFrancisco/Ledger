import type { AppState, CoachNote, LogRec, Task } from "./types";
import { seed } from "./seed";

const KEY = "daily-ledger:v1";

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

export function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return todayStr(d);
}

export function fmtMin(m: number): string {
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h && mm) return `${h}h ${mm}m`;
  if (h) return `${h}h`;
  return `${mm}m`;
}

export function curItem(t: Task) {
  if (!t.items || !t.items.length) return null;
  return t.items[Math.min(t.currentIndex, t.items.length - 1)];
}

export function nextItem(t: Task) {
  if (!t.items || !t.items.length) return null;
  if (t.currentIndex >= t.items.length - 1) return null;
  return t.items[t.currentIndex + 1];
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function normalizeState(s: AppState): AppState {
  s.tasks = s.tasks.filter((t) => t && typeof t === "object" && typeof t.id === "string");
  for (const t of s.tasks) {
    if (typeof t.currentIndex !== "number") t.currentIndex = 0;
    if (typeof t.streak !== "number") t.streak = 0;
    if (typeof t.best !== "number") t.best = 0;
    if (t.lastDone === undefined) t.lastDone = null;
    if (typeof t.finished !== "boolean") t.finished = false;
  }
  s.entries = Array.isArray(s.entries) ? s.entries : [];
  s.todos = Array.isArray(s.todos) ? s.todos : [];
  s.log = s.log && typeof s.log === "object" ? s.log : {};
  return s;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (Array.isArray(s.tasks)) return normalizeState(s);
    }
  } catch {
    /* fall through to seed */
  }
  const s = seed();
  saveState(s);
  return s;
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or unavailable; app keeps working in memory */
  }
}

export function resetState(): AppState {
  const s = seed();
  saveState(s);
  return s;
}

export interface CompleteOpts {
  advance?: boolean;
  text?: string;
}

export function completeTask(state: AppState, id: string, opts: CompleteOpts): AppState {
  const t = todayStr();
  const next = clone(state);
  const nt = next.tasks.find((x) => x.id === id);
  if (!nt) return state;
  if (!next.log[t]) next.log[t] = {};
  if (next.log[t][id]) return state;

  const itemName = curItem(nt)?.name ?? null;
  const rec: LogRec = {
    prevStreak: nt.streak,
    prevBest: nt.best,
    prevLast: nt.lastDone,
    prevIndex: nt.currentIndex,
    prevFinished: nt.finished,
    prevCoach: nt.coach ?? null,
    advanced: false,
    item: itemName,
    text: opts.text?.trim() || ""
  };

  nt.streak = nt.lastDone === yesterdayStr() ? nt.streak + 1 : 1;
  nt.best = Math.max(nt.best, nt.streak);
  nt.lastDone = t;

  if (nt.type === "rotation" && nt.items?.length) {
    nt.currentIndex = (nt.currentIndex + 1) % nt.items.length;
    rec.advanced = true;
  }
  if (nt.type === "sequence" && opts.advance && nt.items?.length) {
    if (nt.currentIndex < nt.items.length - 1) nt.currentIndex += 1;
    else nt.finished = true;
    rec.advanced = true;
  }

  next.log[t][id] = rec;
  if (rec.text) {
    next.entries.push({ date: t, taskId: id, taskName: nt.name, item: itemName, text: rec.text });
  }
  return next;
}

export function uncompleteTask(state: AppState, id: string): AppState {
  const next = clone(state);
  const nt = next.tasks.find((x) => x.id === id);
  if (!nt) return state;
  // The rec lives under the day the task was completed, which is lastDone —
  // not necessarily today if the tab sat open across midnight.
  const t = nt.lastDone && next.log[nt.lastDone]?.[id] ? nt.lastDone : todayStr();
  const rec = next.log[t]?.[id];
  if (!rec) return state;
  nt.streak = rec.prevStreak;
  nt.best = rec.prevBest ?? nt.best;
  nt.lastDone = rec.prevLast;
  nt.currentIndex = rec.prevIndex;
  nt.finished = rec.prevFinished;
  nt.coach = rec.prevCoach;
  delete next.log[t][id];
  next.entries = next.entries.filter((e) => !(e.date === t && e.taskId === id));
  return next;
}

export function setCoach(state: AppState, id: string, coach: CoachNote): AppState {
  const next = clone(state);
  const nt = next.tasks.find((x) => x.id === id);
  if (!nt) return state;
  nt.coach = coach;
  return next;
}

export function recentEntries(state: AppState, id: string, n = 5) {
  return state.entries.filter((e) => e.taskId === id).slice(-n);
}
