# Trainer

A press-play session timer for Block One. She opens it in the gym, picks the next
session in the queue, and the page tells her what to do right now — which lift,
which set, how long to rest — while counting how far ahead of the clock she is.

Live at [lances.site/trainer](https://lances.site/trainer) · [← back to README](../README.md)

This page is static — no backend, no API, no account. The program lives in
`frontend/src/data/trainerProgram.ts`; the coaching document it was built from is
[docs/isabel-block-one.md](isabel-block-one.md).

---

## Why it exists

Block One is designed for someone training alone with remote check-ins, so it has
to be self-explanatory. A PDF isn't — it tells her the whole session at once and
leaves her to work out where she is in it. This shows one step at a time.

The design document is written for the coach, not the athlete. Almost none of it
belongs on her screen: what she gets is the five slots in order, the current
movement, one form cue, and a timer. The evidence base stays in the doc.

---

## The session model

Every session is a flat list of timed steps built by `buildSession(id, oneSetMode)`.
Each step carries a planned duration, which is what makes drift measurable.

| Step kind | Colour | Advances |
|-----------|--------|----------|
| `work` | Amber | Waits for **Start**, then runs until she taps **Done** |
| `rest` | Sky | Starts itself, ends itself — chime and a buzz |
| `move` | Slate | Starts itself, ends on **Ready** — equipment doesn't run on a timer |

A set never starts on its own. Landing on one shows the full duration and a Start
button, because the gap between "the rest timer ended" and "I am under the bar"
is real and shouldn't be billed to the set.

Colour is the primary signal. Which mode she's in reads from across the squat rack
without resolving any text, which is the whole reason the accent shifts per step
rather than staying one brand colour.

### Timing

The program budgets ~34 minutes against a 45-minute cap. The timer deliberately
spends that headroom and lands at **~44 minutes**, because being rushed is what
ends training blocks and finishing early is the correct error.

| Segment | Planned |
|---------|---------|
| Warm-up — cardio, band walks | 7:00 |
| Slot 1 — main lift, incl. ramp-up sets and setup | 17:30 |
| Slot 2 — chest press (hip abduction in the rest) | 7:30 |
| Slot 3 — lat pulldown (side planks in the rest) | 7:30 |
| Slot 4 — lower accessory | 4:15 |
| **Total** | **43:45** |

All three sessions come out the same length. Session C's split squats cost roughly
double per set, so slot 1 trades its second ramp-up set for longer working sets —
930s either way, which is the 15–16 minutes §6 asks for on that day — and the
session still lands inside the 45-minute cap.

`oneSetMode` cuts all three to about 26 minutes.

### What the program constrains

Three details are load-bearing and shouldn't be "simplified" later:

- **Slot 5 pairs with the upper lifts, never slot 1.** The abduction and trunk work
  fills the rest periods of slots 2 and 3. Fatiguing the abductors before split squats
  would degrade exactly the frontal-plane control the program exists to protect.
- **Abduction appears in all three sessions.** The movement rotates — machine in A and
  C, side-lying in B — but the dose doesn't. Trunk work rotates function alongside it
  (side plank for anti-lateral-flexion, dead bug for anti-extension).
- **A → B → C is a queue, not a calendar.** The last completed session is kept in
  `localStorage` and the picker points at the next one. There is no day-of-week
  anywhere in the module, by design — missing a week has to cost nothing.

---

## Ahead / behind

Two clocks run per step, and the difference between them is the whole feature. The
**active** clock runs only while the step is being performed, and is what the
countdown shows. The **wall** clock runs from the moment the step comes up —
including time paused, and time spent standing next to a machine she hasn't started
yet.

```
delta = Σ(planned − wall) over finished steps
      + min(active, planned) on the current step
      − wall on the current step
```

Credit caps at the planned duration, so overrunning stops paying. Everything that
isn't training — pausing, dawdling before tapping Start, running long — ticks the
deficit up live, several times a second. Finishing a set early banks the remainder
the moment she taps Done.

Resting for the full two minutes she was given never makes her look late, because
credit and wall time advance together while a step is actually running. Drift under
twenty seconds reads as "On schedule" rather than a number, since at that scale
it's noise.

Both clocks come from timestamps rather than accumulated ticks, so backgrounding
the tab — which throttles timers hard on mobile — costs accuracy on the redraw but
never on the clock.

---

## One set mode

A checkbox on the start screen cuts every slot to a single set. That's what the
first session of a block should be: her soreness response is unknown, and finding
it out costs one session where guessing wrong costs a week.

---

## Files

| Path | What's in it |
|------|--------------|
| `data/trainerProgram.ts` | The eight movements, the three sessions, and the step builder |
| `hooks/useSessionTimer.ts` | Step advance, pause, drift, rest auto-advance |
| `hooks/useWakeLock.ts` | Keeps the screen on, best-effort |
| `components/trainer/SessionSetup.tsx` | Queue picker and the five slots |
| `components/trainer/SessionRunner.tsx` | The running screen |
| `components/trainer/TickDial.tsx` | The 60-tick stopwatch bezel |
| `components/trainer/modeTheme.ts` | Per-mode Tailwind classes |
| `utils/gymCues.ts` | Chimes and haptics, both best-effort |

---

## Where the cues come from

Each working set shows the "fix this first" cue for that movement from §9 — one
fault per movement, worded as an effect in the world so it's checkable on video.

Two movements have no §9 row yet and their cues were written to match the pattern:
the **45° back extension** ("Stop when your body makes a straight line. No arching
past it.") and the **hip abduction machine** ("Control it on the way back in — that's
the half that counts."). Both are marked with a comment in `trainerProgram.ts`.

---

## Not built yet

No weight logging. She can't record what she lifted, so the double-progression loop
still runs through the coach. That's the obvious next addition — it would let the
page show her last session's load on each set.
