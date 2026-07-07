import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AppState, Task, TaskType } from "../lib/types";
import { CATS } from "../lib/types";
import { curItem, normalizeState } from "../lib/engine";

interface Props {
  state: AppState;
  saveTask: (task: Task, isNew: boolean) => void;
  deleteTask: (id: string) => void;
  onReset: () => void;
  onImport: (s: AppState) => void;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function newTaskTemplate(): Task {
  return {
    id: "t" + Date.now(),
    cat: "skill",
    name: "",
    type: "daily",
    minutes: 30,
    time: "",
    note: "",
    goal: "",
    items: [{ name: "" }],
    currentIndex: 0,
    streak: 0,
    best: 0,
    lastDone: null,
    finished: false,
    coach: null
  };
}

export default function Manage({ state, saveTask, deleteTask, onReset, onImport }: Props) {
  const [editing, setEditing] = useState<{ task: Task; isNew: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daily-ledger-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(String(reader.result)) as AppState;
        // Same normalization as loadState: a hand-edited or partial backup
        // missing log/todos/entries must not crash the app on render.
        if (Array.isArray(s.tasks)) onImport(normalizeState(s));
      } catch {
        /* ignore bad files */
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="mx-auto max-w-xl px-5 pt-[13vh] pb-28 md:mx-0 md:ml-[7vw]">
      <h1 className="mb-8 font-display text-4xl font-light text-ink">Manage the ledger</h1>

      {CATS.map((cat) => {
        const list = state.tasks.filter((t) => t.cat === cat.id);
        return (
          <section key={cat.id} className="mb-8">
            <h2 className="mb-3 font-ui text-[11px] tracking-[0.2em] text-ink-faint uppercase">
              {cat.label}
            </h2>
            <div className="glass rounded-2xl p-2">
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setEditing({ task: clone(t), isNew: false })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-ui text-sm text-ink">
                      {t.name}
                      <span className="ml-2 text-[11px] text-ink-faint">
                        {t.type}
                        {t.minutes ? ` · ${t.minutes}m` : ""}
                        {t.time ? ` · ${t.time}` : ""}
                      </span>
                    </div>
                    {(t.type === "rotation" || t.type === "sequence") && curItem(t) && (
                      <div className="truncate font-ui text-[11.5px] text-ink-faint">
                        now: {curItem(t)?.name}
                      </div>
                    )}
                  </div>
                  <span className="font-ui text-xs text-ink-faint">Edit</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <button
        onClick={() => setEditing({ task: newTaskTemplate(), isNew: true })}
        className="glass w-full rounded-2xl py-3 font-ui text-sm text-ink-dim transition-colors hover:text-ink"
      >
        Add an entry
      </button>

      <section className="glass mt-10 rounded-2xl p-5">
        <h2 className="font-ui text-[11px] tracking-[0.2em] text-ink-faint uppercase">
          Data
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={exportJson}
            className="rounded-xl border border-white/15 px-4 py-2 font-ui text-sm text-ink-dim hover:text-ink"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-white/15 px-4 py-2 font-ui text-sm text-ink-dim hover:text-ink"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="ml-auto font-ui text-sm text-ink-faint hover:text-red-300"
            >
              Reset everything
            </button>
          ) : (
            <span className="ml-auto flex items-center gap-3">
              <span className="font-ui text-xs text-red-300">Wipes streaks and history.</span>
              <button
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
                className="rounded-xl bg-red-400/90 px-3 py-1.5 font-ui text-xs font-medium text-night"
              >
                Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="font-ui text-xs text-ink-faint"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </section>

      <AnimatePresence>
        {editing && (
          <Editor
            key={editing.task.id}
            draft={editing.task}
            isNew={editing.isNew}
            onClose={() => setEditing(null)}
            onSave={(t) => {
              saveTask(t, editing.isNew);
              setEditing(null);
            }}
            onDelete={() => {
              deleteTask(editing.task.id);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function Editor({
  draft: initial,
  isNew,
  onClose,
  onSave,
  onDelete
}: {
  draft: Task;
  isNew: boolean;
  onClose: () => void;
  onSave: (t: Task) => void;
  onDelete: () => void;
}) {
  const [d, setD] = useState<Task>(initial);
  const [confirmDel, setConfirmDel] = useState(false);
  const hasItems = d.type === "rotation" || d.type === "sequence";
  const upd = (patch: Partial<Task>) => setD((x) => ({ ...x, ...patch }));

  const updItem = (i: number, name: string, detail?: string) => {
    const items = (d.items || []).map((it, j) =>
      j === i ? { ...it, name, detail: detail ?? it.detail } : it
    );
    upd({ items });
  };
  const move = (i: number, dir: number) => {
    const items = [...(d.items || [])];
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    let ci = d.currentIndex;
    if (ci === i) ci = j;
    else if (ci === j) ci = i;
    upd({ items, currentIndex: ci });
  };
  const removeItem = (i: number) => {
    const items = (d.items || []).filter((_, j) => j !== i);
    let ci = d.currentIndex;
    if (i < ci) ci -= 1;
    ci = Math.max(0, Math.min(ci, items.length - 1));
    upd({ items, currentIndex: ci });
  };

  const save = () => {
    const out = clone(d);
    out.name = out.name.trim();
    if (!out.name) return;
    out.minutes = Math.max(0, Math.round(Number(out.minutes) || 0));
    if (hasItems) {
      // Dropping blank-named steps shifts the indices of everything after
      // them, so shift currentIndex by the blanks that preceded it.
      const blanksBefore = (out.items || []).filter(
        (it, i) => i < out.currentIndex && !it.name.trim()
      ).length;
      out.items = (out.items || []).filter((it) => it.name.trim());
      if (!out.items.length) return;
      out.currentIndex = Math.max(
        0,
        Math.min(out.currentIndex - blanksBefore, out.items.length - 1)
      );
      // Keep a completed sequence completed unless new milestones were added
      // past the current one; plain field edits must not resurrect it.
      out.finished = out.finished && out.currentIndex >= out.items.length - 1;
    } else {
      // A task switched to daily must not keep driving its card off stale
      // rotation/sequence items.
      delete out.items;
      out.currentIndex = 0;
      out.finished = false;
    }
    onSave(out);
  };

  const label = "mt-4 mb-1 block font-ui text-[11px] tracking-[0.18em] text-ink-faint uppercase";
  const input = "field w-full rounded-xl px-3 py-2 font-ui text-sm";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong max-h-[88vh] w-full overflow-y-auto rounded-t-3xl p-6 sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-light text-ink">
            {isNew ? "New entry" : "Edit entry"}
          </h2>
          <button onClick={onClose} className="font-ui text-sm text-ink-faint hover:text-ink">
            Close
          </button>
        </div>

        <label className={label}>Name</label>
        <input className={input} value={d.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Piano" />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>Category</label>
            <select
              className={input}
              value={d.cat}
              onChange={(e) => upd({ cat: e.target.value as Task["cat"] })}
            >
              {CATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className={label}>Type</label>
            <select
              className={input}
              value={d.type}
              onChange={(e) => {
                const type = e.target.value as TaskType;
                const items = d.items && d.items.length ? d.items : [{ name: "" }];
                upd({ type, items });
              }}
            >
              <option value="daily">Daily (same every day)</option>
              <option value="rotation">Rotation (cycles)</option>
              <option value="sequence">Sequence (milestones)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>Minutes</label>
            <input
              className={input}
              type="number"
              min={0}
              value={d.minutes}
              onChange={(e) => upd({ minutes: Number(e.target.value) })}
            />
          </div>
          <div className="flex-1">
            <label className={label}>Time of day</label>
            <input
              className={input}
              value={d.time}
              onChange={(e) => upd({ time: e.target.value })}
              placeholder="17:30"
            />
          </div>
        </div>

        <label className={label}>Goal (context for the coach)</label>
        <input
          className={input}
          value={d.goal || ""}
          onChange={(e) => upd({ goal: e.target.value })}
          placeholder="Liebestraum No. 3 to performance tempo"
        />

        {!hasItems && (
          <>
            <label className={label}>Note</label>
            <input
              className={input}
              value={d.note || ""}
              onChange={(e) => upd({ note: e.target.value })}
              placeholder="What the minimum version looks like"
            />
          </>
        )}

        {hasItems && (
          <>
            <label className={label}>
              {d.type === "rotation" ? "Rotation steps (dot marks today)" : "Milestones (dot marks current)"}
            </label>
            <div className="space-y-2">
              {(d.items || []).map((it, i) => (
                <div key={i} className="rounded-xl border border-white/10 p-2">
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Set current"
                      onClick={() => upd({ currentIndex: i })}
                      className={`h-4 w-4 shrink-0 rounded-full border transition-colors ${
                        d.currentIndex === i
                          ? "border-gold bg-gold"
                          : "border-white/30 hover:border-gold/70"
                      }`}
                    />
                    <input
                      className={input}
                      value={it.name}
                      onChange={(e) => updItem(i, e.target.value)}
                      placeholder="Step"
                    />
                    <button onClick={() => move(i, -1)} className="px-1 text-ink-faint hover:text-ink" aria-label="Move up">↑</button>
                    <button onClick={() => move(i, 1)} className="px-1 text-ink-faint hover:text-ink" aria-label="Move down">↓</button>
                    <button onClick={() => removeItem(i)} className="px-1 text-ink-faint hover:text-red-300" aria-label="Remove">×</button>
                  </div>
                  <input
                    className={`${input} mt-2`}
                    value={it.detail || ""}
                    onChange={(e) => updItem(i, it.name, e.target.value)}
                    placeholder="Detail (optional)"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => upd({ items: [...(d.items || []), { name: "" }] })}
              className="mt-2 w-full rounded-xl border border-white/10 py-2 font-ui text-xs text-ink-faint hover:text-ink"
            >
              Add step
            </button>
          </>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            className="flex-1 rounded-xl bg-gold py-2.5 font-ui text-sm font-medium text-night hover:opacity-90"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/15 px-5 py-2.5 font-ui text-sm text-ink-dim"
          >
            Cancel
          </button>
        </div>

        {!isNew && (
          <div className="mt-4">
            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                className="font-ui text-xs text-ink-faint hover:text-red-300"
              >
                Delete this entry
              </button>
            ) : (
              <span className="flex items-center gap-3">
                <span className="font-ui text-xs text-red-300">Deletes its streak too.</span>
                <button
                  onClick={onDelete}
                  className="rounded-lg bg-red-400/90 px-3 py-1.5 font-ui text-xs font-medium text-night"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="font-ui text-xs text-ink-faint"
                >
                  Cancel
                </button>
              </span>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
