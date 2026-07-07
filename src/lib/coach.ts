import type { CoachNote, Entry, Task } from "./types";
import { curItem, tomorrowStr } from "./engine";

function ruleNote(task: Task, advanced: boolean): CoachNote {
  const item = curItem(task);
  let note = "";
  let focus = "";
  if (task.type === "rotation" && item) {
    focus = item.name;
    note = item.detail ? `${item.name} next: ${item.detail}.` : `${item.name} is up next.`;
  } else if (task.type === "sequence") {
    if (task.finished) {
      focus = "Milestones complete";
      note = "You cleared the last milestone. Add the next block in Manage.";
    } else if (item) {
      focus = item.name;
      note = advanced
        ? `Next up: ${item.name}.`
        : `Repeating ${item.name} until it sits comfortably.`;
    }
  } else {
    focus = task.name;
    note = task.note || "Same again tomorrow. Keep the chain.";
  }
  return { forDate: tomorrowStr(), focus, note, source: "rule" };
}

export async function fetchCoach(
  task: Task,
  entryText: string,
  advanced: boolean,
  history: Entry[]
): Promise<CoachNote> {
  const fallback = ruleNote(task, advanced);
  if (!entryText.trim()) return fallback;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 14000);
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        task: {
          name: task.name,
          type: task.type,
          goal: task.goal || "",
          note: task.note || "",
          current: curItem(task)?.name || null,
          items: task.items?.map((i) => i.name) || null,
          currentIndex: task.currentIndex,
          advanced
        },
        entry: entryText.trim(),
        history: history.map((h) => ({ date: h.date, item: h.item, text: h.text }))
      })
    });
    clearTimeout(timer);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { note?: string; focus?: string };
    if (!data.note) return fallback;
    return {
      forDate: tomorrowStr(),
      focus: (data.focus || fallback.focus).slice(0, 80),
      note: data.note.slice(0, 400),
      source: "ai"
    };
  } catch {
    return fallback;
  }
}
