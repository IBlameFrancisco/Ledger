import type { AppState } from "../lib/types";

export default function Logbook({ state }: { state: AppState }) {
  const byDate = new Map<string, typeof state.entries>();
  for (const e of state.entries) {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const dates = [...byDate.keys()].sort().reverse();

  return (
    <main className="mx-auto max-w-xl px-5 pt-[13vh] pb-28 md:mx-0 md:ml-[7vw]">
      <h1 className="mb-2 font-display text-4xl font-light text-ink">Logbook</h1>
      <p className="mb-8 font-ui text-sm text-ink-dim">
        Everything you've written in your own words, night by night.
      </p>

      {dates.length === 0 && (
        <div className="glass rounded-2xl p-6 font-ui text-sm text-ink-dim">
          Nothing here yet. Log a task with a note and it lands in the book.
        </div>
      )}

      <div className="space-y-6">
        {dates.map((d) => {
          const label = new Date(d + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
          });
          return (
            <section key={d} className="glass rounded-2xl p-5">
              <h2 className="font-display text-lg text-ink">{label}</h2>
              <div className="mt-3 space-y-3">
                {(byDate.get(d) || []).map((e, i) => (
                  <div key={i} className="border-l border-white/12 pl-3">
                    <div className="font-ui text-[11px] tracking-wide text-ink-faint">
                      {e.taskName}
                      {e.item ? ` · ${e.item}` : ""}
                    </div>
                    <p className="mt-0.5 font-ui text-[13px] leading-relaxed text-ink-dim">
                      {e.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
