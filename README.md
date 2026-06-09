# nosplay-like

A **demo Nostr-style live timeline playback dashboard**, built with React +
TypeScript + Vite.

It simulates a live Nostr feed and lets you scrub, pause, and replay the last
~90 minutes of activity like a DVR — complete with a time ruler, a moving
playback head, a LIVE edge indicator, and per-post played / current / upcoming
states.

> ⚠️ **Demo / sample data only.** Every post is generated locally and
> deterministically. There is **no** network connection, no relays, and no real
> Nostr events. Nothing is published.

## Features

- **Live-updating clock** — the "now" / live edge advances in real time.
- **Timeline ruler** — maps the last 15/30/60/90 minutes onto a horizontal
  track; the rightmost label is always **NOW / LIVE**. Post density is shown as
  marks along the ruler.
- **Playback head** — moves from past toward now; a green **LIVE** badge appears
  when within 10s of the live edge.
- **Controls bar**
  - Play / Pause toggle
  - Speed select: 1.0× / 1.2× / 1.5× / 2.0×
  - Jump back / forward 1 minute
  - **Follow live** toggle (pins the playhead to the advancing live edge)
  - **Window/zoom** select (15 / 30 / 60 / 90 min visible)
  - **Seek slider** to scrub across the range
- **Feed cards** visually differentiate **played** (dimmed), **current**
  (highlighted), and **upcoming** (faded / locked) notes.
- **Auto-advance** playback using a `requestAnimationFrame` loop with real-time
  deltas scaled by the selected speed.
- **Persistence** — playback state (seconds-behind-now, speed, follow, playing,
  window) is saved to `localStorage` under a versioned key and restored on load.
- **Composer stub** — textarea + a NOW / PLAYBACK-position timestamp radio
  group. Posting is intentionally disabled (shows a toast); it's a clearly
  labeled demo stub.
- **Responsive** — the layout stacks and the controls wrap on small screens.

## Project structure

| File              | Purpose                                                            |
| ----------------- | ----------------------------------------------------------------- |
| `src/App.tsx`     | The full timeline playback UI.                                    |
| `src/types.ts`    | Shared TypeScript types (`DemoPost`, `PlaybackState`, …).         |
| `src/demoData.ts` | Deterministic generator for the simulated, varied-density feed.   |
| `src/time.ts`     | Time math: clock labels, minutes-ago, timestamp↔x, ruler ticks.   |
| `src/storage.ts`  | Versioned, safe `localStorage` load/save with defaults.           |

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 (base "/")
```

## Build & preview

```bash
npm run build    # type-checks (tsc -b) then builds to dist/ (base "/nosplay-like/")
npm run preview  # serve the production build locally
```

The production `base` is set to `/nosplay-like/` (see `vite.config.ts`) so the
app works when served from a GitHub Pages project subpath. In dev the base is
`/`.

## Deploy (GitHub Pages)

A GitHub Actions workflow at `.github/workflows/pages.yml` builds and deploys
`dist/` to GitHub Pages on every push to `main`.

To enable: in the repository **Settings → Pages**, set **Source** to
**GitHub Actions**. Once deployed, the app is available at:

```
https://<your-username>.github.io/nosplay-like/
```
