import { useEffect, useMemo, useRef, useState } from 'react';
import { lastFor, record } from '../../data/trainerLog';
import { SessionSummary, useSessionTimer } from '../../hooks/useSessionTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { SessionId, Step } from '../../types/trainer';
import { formatClock } from '../../utils/formatters';
import { stepAdvanced } from '../../utils/gymCues';
import { MODE_THEME } from './modeTheme';
import { RollerDial } from './RollerDial';
import { TickDial } from './TickDial';

interface SessionRunnerProps {
  sessionId: SessionId;
  steps: Step[];
  onComplete: (summary: SessionSummary) => void;
}

const RUNNING_LABEL: Record<Step['kind'], string> = {
  work: 'Done',
  rest: 'Skip rest',
  move: 'Ready',
};

/** Drift under twenty seconds isn't worth a number — it reads as noise. */
const DRIFT_DEADBAND = 20;

/* 0–400 lb in the smallest jump most racks actually offer, and a rep range wide
   enough that a ramp-up set and a long side plank both land on it. */
const WEIGHTS = Array.from({ length: 161 }, (_, i) => i * 2.5);
const REPS = Array.from({ length: 30 }, (_, i) => i + 1);
const WEIGHT_START = 50;
const REPS_START = 10;

export const SessionRunner = ({ sessionId, steps, onComplete }: SessionRunnerProps) => {
  const { index, step, remaining, delta, paused, armed, start, advance, back, togglePause } =
    useSessionTimer(steps, onComplete);
  useWakeLock(true);

  /* The second cue layer. Closes itself on every step change so she never
     advances into the next set with a panel still covering the dial. */
  const [notesOpen, setNotesOpen] = useState(false);
  useEffect(() => setNotesOpen(false), [index]);

  /* Every set that carries a load, ramp-ups included — they're keyed per set,
     so a light ramp-up can't overwrite the working weight it precedes. */
  const logKey = step.logKey;
  const loggable = Boolean(logKey);

  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  /* Dial positions for this session, held per set so that stepping away to a
     rest and back doesn't wipe numbers she hasn't pressed Save on. */
  const pending = useRef<Record<string, { weight: number | null; reps: number | null }>>({});

  useEffect(() => {
    if (!logKey) return;
    const last = pending.current[logKey] ?? lastFor(logKey);
    setWeight(last?.weight ?? null);
    setReps(last?.reps ?? null);
    setSaved(false);
  }, [logKey]);

  const hold = (next: { weight?: number | null; reps?: number | null }) => {
    if (!logKey) return;
    const w = next.weight === undefined ? weight : next.weight;
    const r = next.reps === undefined ? reps : next.reps;
    pending.current[logKey] = { weight: w, reps: r };
    setSaved(false);
  };

  const theme = MODE_THEME[step.kind];
  const next = steps[index + 1];
  const overtime = remaining < 0;

  /* Group the rail by slot so the gaps show her the shape of the session. */
  const groups = useMemo(() => {
    const out: { slot: string; items: number[] }[] = [];
    steps.forEach((s, i) => {
      const last = out[out.length - 1];
      if (last && last.slot === s.slot) last.items.push(i);
      else out.push({ slot: s.slot, items: [i] });
    });
    return out;
  }, [steps]);

  const onSchedule = Math.abs(delta) < DRIFT_DEADBAND;
  const driftLabel = onSchedule
    ? 'On schedule'
    : `${delta > 0 ? '▲' : '▼'} ${formatClock(delta)} ${delta > 0 ? 'ahead' : 'behind'}`;
  const driftClass = onSchedule
    ? 'bg-slate-700/60 text-slate-400'
    : delta > 0
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'bg-rose-500/15 text-rose-400';

  const detail = step.fill ?? step.sub ?? '';
  /* On a rest, the coaching belongs to the slot 5 work filling it, not to the
     lift she just put down — so the panel names that instead. */
  const notesTitle = step.fill ?? step.name;
  /* Setup steps carry the same coaching as the sets they precede — walking up
     to a machine is exactly when she'd want to read it. */
  const expandable = Boolean(step.more?.length || step.alternatives?.length || step.video);

  return (
    <div className="mx-auto flex h-full w-full max-w-lg min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
          Session {sessionId}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs tabular-nums ${driftClass}`}>
          {driftLabel}
        </span>
      </div>

      <div className="flex h-1.5 gap-1.5">
        {groups.map((group) => (
          <div key={group.slot} className="flex gap-0.5" style={{ flex: group.items.length }}>
            {group.items.map((i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-colors ${
                  i < index ? 'bg-slate-500' : i === index ? theme.tick : 'bg-slate-700/70'
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Each text block keeps a fixed height so nothing shifts between steps, but
          those heights are capped against viewport height too — on a short phone
          they compress and the dial, which is the flexible one, takes the rest.
          --name drives both the headline size and its two-line box, so the box
          always fits exactly two lines whatever the screen. */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center py-1 text-center [--name:min(6.6vw,2.7vh,2rem)] sm:py-3">
        <div
          className={`flex h-4 flex-none items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] ${theme.text}`}
        >
          <span className={`h-px w-4 ${theme.rule}`} />
          {step.slotLabel}
          <span className={`h-px w-4 ${theme.rule}`} />
        </div>

        {/* Top-aligned, not centred: a one-line movement name has to start at the
            same y as the first line of a two-line one. */}
        <div className="mt-1.5 flex h-[calc(var(--name)*2.5)] w-full flex-none items-start justify-center">
          <h2 className="max-w-[14ch] text-[length:var(--name)] leading-[1.25] text-slate-100">
            {step.name}
          </h2>
        </div>

        <div className="flex h-[clamp(2.3rem,5.4vh,2.6rem)] w-full flex-none items-start justify-center">
          <p
            className={`max-w-[34ch] text-[length:clamp(0.78rem,1.6vh,0.875rem)] leading-snug tabular-nums ${
              step.fill ? theme.text : 'text-slate-400'
            }`}
          >
            {detail}
          </p>
        </div>

        <div className="flex min-h-[6rem] w-full flex-1 flex-col items-center justify-center py-1.5">
        {/* Equal flex tracks either side of the clock, so each dial sits centred
            in the space between the timer and the edge rather than tucked up
            against the bezel. The 4.5rem box inside each track is reserved on
            every step, dial or not: without it the clock slides sideways and
            resizes between a working set and the rest that follows it. */}
        <div className="flex w-full min-h-0 max-h-[400px] flex-1 items-center justify-between gap-1">
          <div className="flex h-full flex-1 items-center justify-center">
            <div className="h-full w-[4.5rem] flex-none">
              {loggable && (
                <RollerDial
                  values={REPS}
                  value={reps}
                  fallback={REPS_START}
                  onChange={(v) => {
                    setReps(v);
                    hold({ reps: v });
                  }}
                  label="reps"
                  accent={theme.text}
                  syncKey={logKey ?? ''}
                />
              )}
            </div>
          </div>

          <TickDial fraction={overtime ? 0 : remaining / step.secs} stroke={theme.stroke}>
            <span
              className={`text-[clamp(1.5rem,29cqmin,4.5rem)] font-semibold leading-none tabular-nums ${
                overtime ? 'text-rose-400' : armed ? 'text-slate-400' : 'text-slate-100'
              }`}
            >
              {overtime ? '+' : ''}
              {formatClock(remaining)}
            </span>
          </TickDial>

          <div className="flex h-full flex-1 items-center justify-center">
            <div className="h-full w-[4.5rem] flex-none">
              {loggable && (
                <RollerDial
                  values={WEIGHTS}
                  value={weight}
                  fallback={WEIGHT_START}
                  onChange={(v) => {
                    setWeight(v);
                    hold({ weight: v });
                  }}
                  label="lb"
                  accent={theme.text}
                  syncKey={logKey ?? ''}
                />
              )}
            </div>
          </div>
        </div>

          {/* Optional on purpose — a set she forgets to log still counts. The row
              keeps its height on unloggable steps so the clock above it doesn't
              hop when the button comes and goes. */}
          <div className="mt-1.5 flex h-7 flex-none items-center justify-center">
            {loggable && (
              <button
                type="button"
                onClick={() => {
                  if (logKey) record(logKey, weight, reps);
                  setSaved(true);
                }}
                disabled={weight === null && reps === null}
                className={`rounded-md border px-3.5 py-1 text-[0.8rem] uppercase tracking-[0.1em] transition-colors disabled:opacity-25 ${
                  saved
                    ? `border-current ${theme.text}`
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {saved ? 'Saved' : 'Save set'}
              </button>
            )}
          </div>
        </div>

        {/* The one-liner, and the way into everything behind it. Keeps its box
            whether or not this step has a cue, so the dial never moves. */}
        <div className="mt-1.5 flex h-[clamp(3.1rem,9.2vh,4.75rem)] w-full flex-none justify-center">
          {step.cue && (
            <button
              type="button"
              onClick={() => expandable && setNotesOpen(true)}
              disabled={!expandable}
              aria-expanded={notesOpen}
              className={`flex max-w-[34ch] flex-col justify-center rounded-lg px-4 py-2 text-left transition-colors ${theme.soft} ${
                expandable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <span
                className={`mb-0.5 flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.14em] ${theme.text}`}
              >
                {step.fill ? 'Form' : 'Cue'}
                {expandable && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-[3]" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
              </span>
              <p className="text-[length:clamp(0.78rem,1.6vh,0.875rem)] leading-snug text-slate-200">
                {step.cue}
              </p>
            </button>
          )}
        </div>

        {/* Covers the dial, not the controls — she can still hit Done from here,
            and the clock rides along in the header so it's never lost. */}
        {notesOpen && (
          <div className="absolute inset-0 z-30 flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 text-left backdrop-blur-sm">
            <div className="flex flex-none items-start justify-between gap-3 border-b border-slate-700/70 px-4 py-2.5">
              <div className="min-w-0">
                <p className={`text-[0.6rem] uppercase tracking-[0.16em] ${theme.text}`}>
                  {step.slotLabel}
                </p>
                <h3 className="truncate text-sm text-slate-100">{notesTitle}</h3>
              </div>
              <div className="flex flex-none items-center gap-3">
                <span
                  className={`text-sm tabular-nums ${overtime ? 'text-rose-400' : 'text-slate-400'}`}
                >
                  {overtime ? '+' : ''}
                  {formatClock(remaining)}
                </span>
                <button
                  type="button"
                  onClick={() => setNotesOpen(false)}
                  aria-label="Close details"
                  className="grid h-7 w-7 place-items-center rounded-md border border-slate-700 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {step.cue && (
                <p className={`text-sm font-medium leading-snug ${theme.text}`}>{step.cue}</p>
              )}
              {step.more && (
                <ul className="mt-2.5 flex flex-col gap-2">
                  {step.more.map((note) => (
                    <li key={note} className="flex gap-2 text-[0.8rem] leading-snug text-slate-300">
                      <span className="flex-none text-slate-600">·</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Names only — she's scanning for something free, not reading. */}
              {step.alternatives && (
                <div className="mt-3.5 border-t border-slate-700/60 pt-2.5">
                  <p className="mb-1 text-[0.6rem] uppercase tracking-[0.14em] text-slate-500">
                    Swaps
                  </p>
                  <p className="text-[0.8rem] leading-snug text-slate-400">
                    {step.alternatives.join(' · ')}
                  </p>
                </div>
              )}
            </div>

            {step.video && (
              <a
                href={step.video}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-none items-center justify-center gap-2 border-t border-slate-700/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch the demo
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-none flex-col gap-[clamp(0.35rem,1vh,0.625rem)]">
        <p className="h-4 text-center text-[0.65rem] uppercase tracking-[0.16em] text-rose-400">
          {paused ? 'Paused' : ''}
        </p>
        <p className="truncate text-center text-xs text-slate-500">
          {next ? (
            <>
              Up next · <span className="text-slate-400">{next.fill ?? next.name}</span>
            </>
          ) : (
            'Last one'
          )}
        </p>
        <div className="grid grid-cols-[3.25rem_1fr_3.25rem] gap-2">
          <button
            onClick={back}
            disabled={index === 0}
            aria-label="Previous step"
            className="grid place-items-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 transition-colors hover:border-slate-600 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (armed) {
                start();
                return;
              }
              stepAdvanced();
              advance();
            }}
            className={`rounded-lg px-4 py-[clamp(0.7rem,2vh,1rem)] text-base font-semibold uppercase tracking-wide transition-colors ${theme.button}`}
          >
            {armed ? 'Start' : RUNNING_LABEL[step.kind]}
          </button>
          <button
            onClick={togglePause}
            disabled={armed}
            aria-label={paused ? 'Resume' : 'Pause'}
            className="grid place-items-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 transition-colors hover:border-slate-600 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              {paused ? <path d="M7 4.5v15l13-7.5z" /> : <path d="M9 5v14M15 5v14" />}
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
