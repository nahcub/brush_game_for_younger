# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based prototype ("brush game") that uses a webcam and MediaPipe FaceLandmarker to detect
whether a child is actively brushing their teeth, and gamifies it with a progress gauge, particle
effects, lyrics, and a loot-box reward (no gambling mechanics — see `src/rewards.js` / `src/game.js`
comments). See [plan.md](plan.md) (Korean) for full product intent and design rationale — read it
before making behavioral changes, since most "why" decisions live there, not in code comments.

Everything runs on-device in the browser; no backend, no video leaves the client. This is a
deliberate constraint, not an oversight — don't introduce a server component or cloud inference.

## Commands

```bash
npm install       # also runs postinstall → scripts/setup-assets.mjs
npm run setup      # re-run asset setup manually (copies wasm, downloads face model)
npm run dev        # vite dev server
npm run build       # vite build → dist/
npm run preview      # preview production build
```

There is no test suite or linter configured in this repo.

`scripts/setup-assets.mjs` copies the MediaPipe wasm runtime from `node_modules` into `public/wasm`
and downloads `face_landmarker.task` into `public/models` if not already present. Both `public/wasm`
and `public/models` are gitignored (regenerated, not committed) — run `npm run setup` if they're
missing after a fresh clone.

## Architecture

Vanilla JS + Vite, no framework, no build-time bundsplitting concerns. `src/main.js` is the
composition root: it wires together independent, dependency-free modules and drives a single
`requestAnimationFrame` loop. Each module below is a factory function (`createX()`) returning an
object with `update()`/`draw()` methods and plain getters — no classes, no external state
management.

- **`src/brushDetector.js`** — the core signal. Turns raw face landmarks into a boolean
  "brushing" state. Computes movement energy of mouth/jaw landmarks (`MOUTH_INDICES`), subtracts
  head-motion (via a `STABLE` landmark set) so turning your head isn't mistaken for brushing,
  normalizes by face width (distance-invariant) and by dt (framerate-invariant), then smooths with
  an EMA and applies `BRUSH_THRESHOLD` with a `STOP_DELAY_MS` grace period so brief signal gaps
  don't immediately stop the game. Tuning constants live at the top of the file and are surfaced
  live in the on-screen debug readout — tune by watching that readout while brushing on webcam, not
  by guessing.
- **`src/game.js`** — progress gauge / timer state machine. Time only accumulates while
  `brushing` is true (`DURATION_MS`); tracks `longestPause` to grade the reward box on completion
  (uninterrupted run → gold, otherwise silver — see `gradeFor`). No fail state, no losing.
- **`src/effects.js`** — particle system (bubbles/stars) spawned from the lip-ring landmarks,
  purely cosmetic feedback while `brushing` is true.
- **`src/lyrics.js`** — rotates a fixed line every `LINE_MS`, but only while brushing is active
  (pausing brushing pauses the lyrics too, so a kid can keep up).
- **`src/rewards.js`** — reward box grading/items. No "nothing" outcome by design (see comments —
  this is a product/ethics constraint for a kids' product, not an oversight to "fix").
- **`src/main.js`** — loads `FaceLandmarker` from `/wasm` + `/models` (GPU delegate, VIDEO
  running mode), gates webcam access behind a Start button, runs the per-frame loop that: detects
  landmarks only when `video.currentTime` advances, feeds them to `brushDetector`, updates
  `game`/`effects`/`lyrics`, and renders overlay canvas + DOM status/gauge/debug text. Press `D` to
  toggle landmark dot rendering (on by default for tuning; turn off for kid-facing demos).

### Key invariants to preserve when changing detection/game logic

- Judgement is intentionally binary ("brushing or not"), not which-tooth-being-brushed — see
  plan.md's rationale before adding finer-grained detection.
  All ambiguous signal should resolve toward "assume brushing" (never punish false negatives
  aggressively) — this is a stated design principle, not a bug.
- The gauge must only progress on actual detected brushing motion, never on mere webcam presence.
