import { useCallback, useEffect, useRef, useState } from 'react';
import { Step } from '../types/trainer';
import { countdownTick, restOver, stepAdvanced } from '../utils/gymCues';

export interface SessionSummary {
  /** Wall-clock seconds from the first tap to the last. */
  elapsed: number;
  /** Planned minus actual: positive means she finished ahead. */
  delta: number;
}

export interface SessionTimer {
  index: number;
  step: Step;
  /** Seconds left on this step. Goes negative once she runs over. */
  remaining: number;
  /** Cumulative seconds ahead (+) or behind (−) the plan, live. */
  delta: number;
  paused: boolean;
  /** A set that's queued up but hasn't been started yet. */
  armed: boolean;
  start: () => void;
  advance: () => void;
  back: () => void;
  togglePause: () => void;
}

/** Sets wait to be started; rests and walks between machines start themselves. */
const startsItself = (step: Step) => step.kind !== 'work';

/**
 * Drives one session.
 *
 * Two clocks run per step and the difference between them is the whole feature.
 * The *active* clock only runs while the step is actually being performed, and is
 * what the countdown shows. The *wall* clock runs from the moment the step comes
 * up, including time spent paused or standing next to a machine she hasn't started
 * yet. Drift is credit earned on the active clock minus time spent on the wall
 * clock, so anything that isn't training ticks the deficit up in real time.
 *
 * Both are measured from timestamps rather than accumulated ticks, so
 * backgrounding the tab — which throttles timers hard on mobile — costs accuracy
 * on the redraw but never on the clock.
 */
export function useSessionTimer(
  steps: Step[],
  onComplete: (summary: SessionSummary) => void,
): SessionTimer {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(() => startsItself(steps[0]));
  const [, forceRender] = useState(0);

  /** Wall-clock seconds spent on each finished step, parallel to `steps`. */
  const actual = useRef<number[]>([]);
  const sessionStart = useRef(Date.now());
  /** When the current step came up, regardless of whether it's running. */
  const stepShownAt = useRef(Date.now());
  /** Running time banked in this step before the current pause. */
  const activeBefore = useRef(0);
  /** Timestamp the active clock started, or 0 while armed or paused. */
  const activeSince = useRef(startsItself(steps[0]) ? Date.now() : 0);
  const lastBeep = useRef(-1);
  const done = useRef(false);

  /* Redraw five times a second. Both clocks are derived, never counted. */
  useEffect(() => {
    const id = window.setInterval(() => forceRender((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, []);

  const activeSeconds = useCallback(
    () =>
      (activeBefore.current +
        (activeSince.current ? Date.now() - activeSince.current : 0)) /
      1000,
    [],
  );

  const enterStep = useCallback(
    (next: number) => {
      const auto = startsItself(steps[next]);
      stepShownAt.current = Date.now();
      activeBefore.current = 0;
      activeSince.current = auto ? Date.now() : 0;
      lastBeep.current = -1;
      setStarted(auto);
      setPaused(false);
      setIndex(next);
    },
    [steps],
  );

  const step = steps[Math.min(index, steps.length - 1)];
  const active = activeSeconds();
  const remaining = step.secs - active;
  const armed = !started;

  /* Time banked on finished steps, plus whatever this step has earned so far.
     Credit caps at the planned duration, so overrunning stops paying. */
  const banked = actual.current.reduce(
    (sum, seconds, i) => sum + (steps[i].secs - seconds),
    0,
  );
  const wallInStep = (Date.now() - stepShownAt.current) / 1000;
  const delta = banked + Math.min(active, step.secs) - wallInStep;

  const start = useCallback(() => {
    if (started) return;
    activeSince.current = Date.now();
    setStarted(true);
  }, [started]);

  const advance = useCallback(() => {
    if (done.current) return;
    actual.current[index] = (Date.now() - stepShownAt.current) / 1000;

    if (index >= steps.length - 1) {
      done.current = true;
      const elapsed = (Date.now() - sessionStart.current) / 1000;
      const planned = steps.reduce((total, s) => total + s.secs, 0);
      onComplete({ elapsed, delta: planned - elapsed });
      return;
    }
    enterStep(index + 1);
  }, [index, steps, onComplete, enterStep]);

  const back = useCallback(() => {
    if (index === 0) return;
    actual.current.length = index - 1;
    enterStep(index - 1);
  }, [index, enterStep]);

  const togglePause = useCallback(() => {
    if (!started) return;
    setPaused((wasPaused) => {
      if (wasPaused) {
        activeSince.current = Date.now();
      } else {
        activeBefore.current += Date.now() - activeSince.current;
        activeSince.current = 0;
      }
      return !wasPaused;
    });
  }, [started]);

  /* Rests run themselves out — that's the whole point of a rest timer. Sets and
     walks between machines wait for her, because equipment doesn't. */
  useEffect(() => {
    if (paused || step.kind !== 'rest' || done.current) return;
    const left = step.secs - activeSeconds();
    const secondsLeft = Math.ceil(left);
    if (secondsLeft <= 3 && secondsLeft > 0 && secondsLeft !== lastBeep.current) {
      lastBeep.current = secondsLeft;
      countdownTick();
    }
    if (left <= 0) {
      restOver();
      advance();
    }
  });

  /* Space starts or finishes the step, left arrow steps back — useful when it's
     propped against a dumbbell rack. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!started) {
          start();
        } else {
          stepAdvanced();
          advance();
        }
      }
      if (e.code === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, back, start, started]);

  return { index, step, remaining, delta, paused, armed, start, advance, back, togglePause };
}
