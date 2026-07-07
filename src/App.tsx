import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BeachScene } from "./scene/BeachScene";
import type { AppState, CoachNote, Task, Todo } from "./lib/types";
import {
  completeTask,
  loadState,
  recentEntries,
  resetState,
  saveState,
  setCoach,
  todayStr,
  tomorrowStr,
  uncompleteTask
} from "./lib/engine";
import { fetchCoach } from "./lib/coach";
import Today from "./components/Today";
import Manage from "./components/Manage";
import Logbook from "./components/Logbook";

export type View = "today" | "manage" | "logbook";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>("today");
  const [day, setDay] = useState<string>(() => todayStr());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<BeachScene | null>(null);
  const stateRef = useRef(state);
  const coachTokens = useRef<Record<string, number>>({});

  // Roll the whole UI over at midnight: a tab left open otherwise keeps
  // yesterday's date, checkmarks, and dead Undo buttons.
  useEffect(() => {
    const id = setInterval(() => {
      const d = todayStr();
      setDay((prev) => (prev === d ? prev : d));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const scene = new BeachScene(canvasRef.current);
    sceneRef.current = scene;
    scene.play();
    const move = (e: PointerEvent) => scene.setPointer(e.clientX, e.clientY);
    const leave = () => scene.clearPointer();
    const down = (e: PointerEvent) => scene.ripple(e.clientX, e.clientY);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      document.documentElement.removeEventListener("pointerleave", leave);
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  const today = day;
  const log = state.log[today] || {};
  const doneCount = state.tasks.filter((t) => log[t.id]).length;

  useEffect(() => {
    sceneRef.current?.setProgress(state.tasks.length ? doneCount / state.tasks.length : 0);
  }, [doneCount, state.tasks.length]);

  const handleComplete = useCallback(
    (task: Task, opts: { advance?: boolean; text?: string }, at?: { x: number; y: number }) => {
      const s = stateRef.current;
      if (s.log[todayStr()]?.[task.id]) return;
      const next = completeTask(s, task.id, opts);
      if (next === s) return;
      setState(next);

      const nowLog = next.log[todayStr()] || {};
      const allDone = next.tasks.every((t) => nowLog[t.id]);
      if (allDone) sceneRef.current?.meteorShower(6);
      else if (at) sceneRef.current?.ripple(at.x, at.y);

      const updated = next.tasks.find((t) => t.id === task.id);
      if (updated) {
        const history = recentEntries(next, task.id, 5);
        // Stamp dates and a request token now: the response may land after
        // midnight, after an undo, or after a newer completion.
        const logDate = todayStr();
        const forDate = tomorrowStr();
        const token = (coachTokens.current[task.id] || 0) + 1;
        coachTokens.current[task.id] = token;
        void fetchCoach(
          updated,
          opts.text || "",
          !!opts.advance || task.type === "rotation",
          history,
          forDate
        ).then((coach: CoachNote) => {
          setState((s2) => {
            if (coachTokens.current[task.id] !== token) return s2;
            if (!s2.log[logDate]?.[task.id]) return s2;
            return setCoach(s2, task.id, coach);
          });
        });
      }
    },
    []
  );

  const handleUndo = useCallback((id: string) => {
    coachTokens.current[id] = (coachTokens.current[id] || 0) + 1;
    setState((s) => uncompleteTask(s, id));
  }, []);

  const setTodos = useCallback((fn: (todos: Todo[]) => Todo[]) => {
    setState((s) => ({ ...s, todos: fn(s.todos) }));
  }, []);

  const saveTask = useCallback((task: Task, isNew: boolean) => {
    setState((s) => ({
      ...s,
      tasks: isNew ? [...s.tasks, task] : s.tasks.map((t) => (t.id === task.id ? task : t))
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const doReset = useCallback(() => {
    setState(resetState());
  }, []);

  const doImport = useCallback((s: AppState) => {
    setState(s);
  }, []);

  const nav = useMemo(
    () =>
      [
        { id: "today", label: "Today" },
        { id: "logbook", label: "Logbook" },
        { id: "manage", label: "Manage" }
      ] as { id: View; label: string }[],
    []
  );

  return (
    <div className="relative min-h-screen">
      <canvas ref={canvasRef} className="fixed inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10">
        <nav className="fixed top-0 right-0 z-20 flex gap-1 p-4 sm:p-6">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`rounded-full px-4 py-1.5 font-ui text-[13px] tracking-wide transition-colors ${
                view === n.id
                  ? "glass-strong text-ink"
                  : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        {view === "today" && (
          <Today
            state={state}
            onComplete={handleComplete}
            onUndo={handleUndo}
            setTodos={setTodos}
          />
        )}
        {view === "manage" && (
          <Manage
            state={state}
            saveTask={saveTask}
            deleteTask={deleteTask}
            onReset={doReset}
            onImport={doImport}
          />
        )}
        {view === "logbook" && <Logbook state={state} />}
      </div>
    </div>
  );
}
