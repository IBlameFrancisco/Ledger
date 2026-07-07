# Daily Ledger

A moonlit beach where the ocean is made of characters, with your daily routine living on top of it. Log what you actually did each day, in your own words, and the ledger derives tomorrow from it.

## Running it

```bash
npm install
npm run dev
```

Open the printed localhost URL. The scene, the ledger, streaks, logging, the logbook, and the rule-based "what's next" engine all work with no configuration. Data lives in localStorage on the device; use Manage → Export JSON for backups or to move devices.

## The AI coach

When you log a task with a written note, the app calls `/api/coach`, which asks a Haiku-class Claude model to write tomorrow's assignment from what you actually logged. Without the endpoint the app silently falls back to the deterministic engine (rotations still rotate, sequences still advance or repeat), so nothing breaks offline.

To enable it:

1. Push this repo to GitHub and import it into Vercel (zero config, the `api/` folder deploys as an edge function automatically).
2. In Vercel project settings, add an environment variable `ANTHROPIC_API_KEY` with a key from console.anthropic.com.
3. Redeploy.

Local development with the coach: `npm i -g vercel && vercel dev` (runs Vite plus the edge function together). Cost at ~15 short calls a day is a few cents a month.

## Install on your phone

Deployed on Vercel it is a PWA. On iOS: open in Safari → Share → Add to Home Screen. It runs fullscreen with the scene edge to edge.

## Architecture

- `src/scene/BeachScene.ts`, the renderer. Canvas 2D at device pixel ratio with additive-light compositing for the moon, its reflection column, and foam, plus film grain, pointer parallax, the character sea (traveling swells reveal fixed glyphs, glyphs flee the cursor), tide, sand sparkle, distant coast lights, and meteors. Every click ripples the water; finishing all tasks fires a meteor shower. Respects `prefers-reduced-motion` with a static frame.
- `src/lib/engine.ts`, deterministic state: streak math, rotation/sequence advancement, undo with full restore, localStorage persistence.
- `src/lib/coach.ts` + `api/coach.ts`, the AI layer. Client sends task goal, program position, recent entries, and today's log; the edge function holds the API key and returns `{focus, note}` JSON.
- `src/components/`, the three views (Today, Manage, Logbook) in React + Tailwind 4 + Framer Motion, glass panels over the scene, Fraunces for display type and Space Grotesk for the interface.

## Roadmap

- Push notification reminders (requires a small worker with VAPID keys and a subscription store; until then, recurring phone alarms pointed at the app cover the trigger).
- WebGL water pass for refraction and real bloom behind the same `BeachScene` interface.
- Sky driven by the real clock: dusk, deep night, and dawn palettes.
- Night atlas: each fully logged day archived as a rendered card of that night.
