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
  The run is split into `QUADRANT_COUNT` (4) mouth quadrants of `QUADRANT_MS` each: `progress`
  is progress *within the current quadrant*, so the gauge fills and resets four times rather
  than filling once. `quadrant` (0–3) is what `main.js` watches to move the brush and fire the
  mascot. Quadrant advance is purely time-based — the detector cannot tell which quadrant is
  being brushed, and deliberately doesn't try (see the binary-judgement invariant below).
- **`src/effects.js`** — particle system (bubbles/stars) spawned from the lip-ring landmarks,
  purely cosmetic feedback while `brushing` is true.
- **`src/lyrics.js`** — rotates a fixed line every `LINE_MS`, but only while brushing is active
  (pausing brushing pauses the lyrics too, so a kid can keep up).
- **`src/audio.js`** — background music (`public/audio/bgm.mp3`, looped) plus the completion
  "ding", which is synthesized with WebAudio rather than shipped as a file so pitch/decay stay
  tunable from constants. **BGM is on** — see "Background music" below for how to silence it
  during development without touching the code.
- **`src/rewards.js`** — reward box grading/items. No "nothing" outcome by design (see comments —
  this is a product/ethics constraint for a kids' product, not an oversight to "fix").
- **`src/main.js`** — loads `FaceLandmarker` from `/wasm` + `/models` (GPU delegate, VIDEO
  running mode), gates webcam access behind a Start button, runs the per-frame loop that: detects
  landmarks only when `video.currentTime` advances, feeds them to `brushDetector`, updates
  `game`/`effects`/`lyrics`, and renders overlay canvas + DOM status/gauge/debug text. Press `D` to
  toggle landmark dot rendering (on by default for tuning; turn off for kid-facing demos).
  Also owns `QUADRANTS` — the four brush positions around the mouth (offset as a multiple of face
  width, plus x/y image flips fed to CSS as `--fx`/`--fy`). See "Telling a kid where to brush".

### Fitting one screen (no scrolling)

The whole game must sit inside one viewport — `body` centers `#world` with flex, so anything that
overflows is clipped symmetrically at top *and* bottom with no way to scroll to it. The first thing
lost is the top gauge bar, which is the one piece of feedback the child is watching.

`#world` is a flex column capped at `100dvh`; `#hud` is `flex: none` and `#stage` is `flex: 0 1 auto`
with `min-height: 0`. So the camera window is the only thing that gives. Its `aspect-ratio: 4 / 3`
is a **maximum** height, not a fixed ratio — on a short landscape screen (iPad in Safari) it squeezes
flatter, keeping its width and cropping more off the top and bottom. The face is centered, so that
crop costs less than shrinking the whole window would.

Don't reintroduce a hardcoded "chrome height" constant to compute the stage size — that was the
previous approach and it silently re-clipped the gauge whenever HUD padding or the mascot size
changed. Let flex measure it.

Detection is unaffected: the `aspect` passed to `brushDetector` is the *video's* ratio
(`canvas.width / canvas.height`), not the stage's, and `videoPointToStage()` re-derives the
`object-fit: cover` mapping from live `getBoundingClientRect()` values every frame.

### Background music (ON)

`BGM_ENABLED` at the top of `src/audio.js` is `true` — that is the correct state for any demo or
deployment, because the landing screen is meant to be audibly "on" so a passing kid stops walking.
Don't flip the constant to `false` and commit it; use the query param below instead.

- Silence it for one dev session, no code change: append `?bgm=0` to the URL (`?bgm=1` forces it
  on). The query param wins over the constant. Use this when the same loop on every hot reload
  gets old.
- The constant itself: `const BGM_ENABLED = true;` in `src/audio.js`. When it is `false` the mp3
  isn't even given to the `<audio>` element, so no 1.4MB fetch happens — but that is a local
  convenience, not a state to ship.

The completion ding is *not* covered by this flag — it's one short sound and stays on. The 🔊
button in the HUD mutes both, and persists to `localStorage` under `brush-game.muted`.

Browsers block autoplay without a user gesture, so `audio.arm()` tries to play on load and, if
refused, retries on the first `pointerdown`/`touchstart`/`keydown` anywhere on the page. For a
kiosk that must have sound before anyone touches it, launch Chrome with
`--autoplay-policy=no-user-gesture-required`.

### Telling a kid where to brush

Which quadrant to brush is communicated **only by where the toothbrush appears on screen** —
never in words. The video is mirrored (`scaleX(-1)`, and `videoPointToStage` flips x to match),
so the screen behaves like a mirror: the child puts their hand where they see the brush and lands
on the right side of their own mouth. Say "오른쪽" out loud instead and they go the other way,
because the face they're looking at is reversed. 4–7 year olds also don't have stable left/right
yet, which is the second reason not to use the words.

Consequences to keep in mind:

- Don't add left/right wording to lyrics, labels, or voice lines. Up/down is safe (no mirroring)
  and body-relative wording ("볼 쪽", "앞니") is safe. `src/lyrics.js` follows this.
- The brush is **on-screen for the whole run** (`.shown`, dimmed), not just when the child stops.
  It's an instruction now, not a nag. It goes fully opaque (`.up`, with the Bass-method circling
  animation) for `NUDGE_HOLD_MS` after each quadrant change, and again after `NUDGE_AFTER_MS`
  of no brushing.
- `mascot-cheer` jumps up from the bottom on each quadrant change to break the child's gaze so
  they notice the brush moved. It must not pause the gauge — congratulating a kid into stopping
  is worse than no transition at all.
- The brush image's bristle tip is the anchor (`transform-origin: 17% 20%`), so the flips leave
  the tip glued to the target point. Base art (handle lower-right) reads as *upper* teeth; `fy: -1`
  puts the handle above and reads as *lower* teeth.

### Key invariants to preserve when changing detection/game logic

- Judgement is intentionally binary ("brushing or not"), not which-tooth-being-brushed — see
  plan.md's rationale before adding finer-grained detection.
  All ambiguous signal should resolve toward "assume brushing" (never punish false negatives
  aggressively) — this is a stated design principle, not a bug.
- The gauge must only progress on actual detected brushing motion, never on mere webcam presence.
