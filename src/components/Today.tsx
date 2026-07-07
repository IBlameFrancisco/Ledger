import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AppState, Task, Todo } from "../lib/types";
import { CATS } from "../lib/types";
import { curItem, fmtMin, nextItem, todayStr } from "../lib/engine";

interface Props {
  state: AppState;
  onComplete: (
    task: Task,
    opts: { advance?: boolean; text?: string },
    at?: { x: number; y: number }
  ) => void;
  onUndo: (id: string) => void;
  setTodos: (fn: (todos: Todo[]) => Todo[]) => void;
}

function dateLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export default function Today({ state, onComplete, onUndo, setTodos }: Props) {
  const today = todayStr();
  const log = state.log[today] || {};
  const doneCount = state.tasks.filter((t) => log[t.id]).length;
  const totalMin = state.tasks.reduce((a, t) => a + t.minutes, 0);
  const doneMin = state.tasks.reduce((a, t) => a + (log[t.id] ? t.minutes : 0), 0);
  const pct = state.tasks.length ? Math.round((doneCount / state.tasks.length) * 100) : 0;
  const [newTodo, setNewTodo] = useState("");
  const carried = state.tasks.filter(
    (t) => log[t.id]?.advanced && !t.finished && t.items?.length
  );

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    setTodos((td) => [...td, { id: "td" + Date.now(), text, done: false }]);
    setNewTodo("");
  };

  return (
    <main className="mx-auto max-w-xl px-5 pt-[15vh] pb-28 md:mx-0 md:ml-[7vw]">
      <header className="mb-10">
        <div className="font-ui text-[11px] tracking-[0.2em] text-ink-faint uppercase">
          Daily ledger
        </div>
        <h1 className="mt-1 font-display text-[40px] leading-tight font-light text-ink sm:text-5xl">
          {dateLabel()}
        </h1>
        <div className="mt-4 flex items-baseline justify-between font-ui text-xs text-ink-faint">
          <span>
            {doneCount} of {state.tasks.length} logged
          </span>
          <span>
            {fmtMin(doneMin)} of {fmtMin(totalMin)}
          </span>
        </div>
        <div className="mt-2 h-px w-full bg-white/10">
          <div
            className="h-px bg-gold transition-all duration-700"
            style={{ width: pct + "%" }}
          />
        </div>
      </header>

      {CATS.map((cat) => {
        const list = state.tasks.filter((t) => t.cat === cat.id);
        if (!list.length) return null;
        const d = list.filter((t) => log[t.id]).length;
        return (
          <section key={cat.id} className="mb-9">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-ui text-[11px] tracking-[0.2em] text-ink-faint uppercase">
                {cat.label}
              </h2>
              <span className="font-ui text-[11px] text-ink-faint/70">
                {d}/{list.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {list.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  rec={log[t.id]}
                  onComplete={onComplete}
                  onUndo={onUndo}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="mb-9">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-ui text-[11px] tracking-[0.2em] text-ink-faint uppercase">
            Work to-do
          </h2>
          <span className="font-ui text-[11px] text-ink-faint/70">
            {state.todos.filter((x) => x.done).length}/{state.todos.length}
          </span>
        </div>
        <div className="glass rounded-2xl p-2">
          {state.todos.map((td) => (
            <div key={td.id} className="group flex items-center gap-3 rounded-xl px-3 py-2.5">
              <button
                aria-label={td.done ? "Mark not done" : "Mark done"}
                onClick={() =>
                  setTodos((list) =>
                    list.map((x) => (x.id === td.id ? { ...x, done: !x.done } : x))
                  )
                }
                className={`h-[18px] w-[18px] shrink-0 rounded-full border transition-colors ${
                  td.done ? "border-gold bg-gold" : "border-white/25 hover:border-gold/70"
                }`}
              />
              <span
                className={`flex-1 font-ui text-sm ${
                  td.done ? "text-ink-faint line-through" : "text-ink"
                }`}
              >
                {td.text}
              </span>
              <button
                aria-label="Delete"
                onClick={() => setTodos((list) => list.filter((x) => x.id !== td.id))}
                className="text-ink-faint/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink-dim"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex gap-2 p-2">
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTodo();
              }}
              placeholder="Add a work item"
              className="field flex-1 rounded-xl px-3 py-2 font-ui text-sm"
            />
            <button
              onClick={addTodo}
              className="rounded-xl border border-white/15 px-4 font-ui text-sm text-ink-dim transition-colors hover:border-gold/60 hover:text-ink"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {carried.length > 0 && (
        <section className="glass rounded-2xl p-4">
          <div className="font-ui text-[11px] tracking-[0.2em] text-ink-faint uppercase">
            Carried to tomorrow
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {carried.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-white/12 px-3 py-1 font-ui text-xs text-ink-dim"
              >
                {t.name}: <span className="text-ink">{curItem(t)?.name}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TaskCard({
  task,
  rec,
  onComplete,
  onUndo
}: {
  task: Task;
  rec?: { advanced: boolean; item: string | null; text: string };
  onComplete: Props["onComplete"];
  onUndo: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [advance, setAdvance] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);
  const today = todayStr();

  const item = curItem(task);
  const next = nextItem(task);
  const isSeq = task.type === "sequence";
  const title = rec ? rec.item ?? task.name : task.items ? item?.name ?? task.name : task.name;
  const label = task.items ? task.name : null;
  const coachActive = task.coach && task.coach.forDate === today ? task.coach : null;
  const subline = rec
    ? null
    : coachActive
      ? coachActive.note
      : task.items
        ? item?.detail || null
        : task.note || null;

  const center = () => {
    const r = ref.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  };

  const submit = (asPlanned: boolean) => {
    onComplete(task, { advance: isSeq ? (asPlanned ? true : advance) : true, text: asPlanned ? "" : text }, center());
    setOpen(false);
    setText("");
  };

  return (
    <motion.div
      ref={ref}
      layout
      transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
      className={`glass rounded-2xl px-4 py-3.5 ${rec ? "opacity-75" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 shrink-0 pt-1 font-ui text-[11px] text-ink-faint">{task.time}</div>
        <div className="min-w-0 flex-1">
          {label && (
            <div className="flex items-center gap-2 font-ui text-[11px] text-ink-faint">
              <span>{label}</span>
              {task.streak > 0 && <span className="text-gold">{task.streak}d</span>}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-display text-[17px] text-ink">
              {task.finished && !rec ? "Milestones complete" : title}
            </span>
            {!label && task.streak > 0 && (
              <span className="font-ui text-[11px] text-gold">{task.streak}d</span>
            )}
          </div>
          {subline && !rec && (
            <p className="mt-1 font-ui text-[12.5px] leading-relaxed text-ink-dim">{subline}</p>
          )}
          {rec && (
            <div className="mt-1">
              {rec.text && (
                <p className="font-ui text-[12.5px] leading-relaxed text-ink-dim italic">
                  “{rec.text}”
                </p>
              )}
              {task.coach && task.coach.forDate > today ? (
                <p className="mt-1.5 font-ui text-[12.5px] leading-relaxed text-ink-dim">
                  <span className="text-gold">Tomorrow · {task.coach.focus}. </span>
                  {task.coach.note}
                </p>
              ) : (
                <p className="mt-1.5 font-ui text-[12px] text-ink-faint">
                  Logged. Writing tomorrow's note…
                </p>
              )}
              <button
                onClick={() => onUndo(task.id)}
                className="mt-2 font-ui text-[11px] text-ink-faint underline-offset-2 hover:text-ink-dim hover:underline"
              >
                Undo
              </button>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-ui text-[11px] text-ink-faint/70">
            {task.minutes ? task.minutes + "m" : ""}
          </span>
          {!rec && (
            <button
              aria-label="Log this"
              onClick={() => setOpen((o) => !o)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                open
                  ? "border-gold text-gold"
                  : "border-white/25 text-transparent hover:border-gold/80 hover:text-gold/80"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          )}
          {rec && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-night">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && !rec && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-white/10 pt-3 pl-14">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="What did you actually do?"
                className="field w-full resize-none rounded-xl px-3 py-2.5 font-ui text-sm leading-relaxed"
              />
              {isSeq && (
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => setAdvance(true)}
                    className={`rounded-full px-3.5 py-1.5 font-ui text-xs transition-colors ${
                      advance
                        ? "bg-gold/90 text-night"
                        : "border border-white/15 text-ink-dim hover:text-ink"
                    }`}
                  >
                    {next ? `Advance → ${next.name}` : "Final milestone"}
                  </button>
                  <button
                    onClick={() => setAdvance(false)}
                    className={`rounded-full px-3.5 py-1.5 font-ui text-xs transition-colors ${
                      !advance
                        ? "bg-gold/90 text-night"
                        : "border border-white/15 text-ink-dim hover:text-ink"
                    }`}
                  >
                    Repeat
                  </button>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => submit(false)}
                  className="rounded-xl bg-gold px-4 py-2 font-ui text-sm font-medium text-night transition-opacity hover:opacity-90"
                >
                  Log it
                </button>
                <button
                  onClick={() => submit(true)}
                  className="rounded-xl border border-white/15 px-4 py-2 font-ui text-sm text-ink-dim transition-colors hover:border-gold/50 hover:text-ink"
                >
                  As planned
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto font-ui text-xs text-ink-faint hover:text-ink-dim"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
