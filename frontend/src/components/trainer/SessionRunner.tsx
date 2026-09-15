import { useMemo } from 'react';
import { SessionSummary, useSessionTimer } from '../../hooks/useSessionTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { SessionId, Step } from '../../types/trainer';
import { formatClock } from '../../utils/formatters';
import { stepAdvanced } from '../../utils/gymCues';
import { MODE_THEME } from './modeTheme';
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

export const SessionRunner = ({ sessionId, steps, onComplete }: SessionRunnerProps) => {
  const { index, step, remaining, delta, paused, armed, start, advance, back, togglePause } =
    useSessionTimer(steps, onComplete);
  useWakeLock(true);

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
      <div className="flex min-h-0 flex-1 flex-col items-center py-1 text-center [--name:min(6.6vw,2.7vh,2rem)] sm:py-3">
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

        <div className="flex min-h-[6rem] w-full flex-1 items-center justify-center py-1.5">
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
        </div>

        <div className="mt-1.5 flex h-[clamp(3.1rem,9.2vh,4.75rem)] w-full flex-none justify-center">
          <div
            className={`flex max-w-[34ch] flex-col justify-center rounded-lg px-4 py-2 ${theme.soft} ${
              step.cue ? '' : 'invisible'
            }`}
          >
            <span className={`mb-0.5 text-[0.6rem] uppercase tracking-[0.14em] ${theme.text}`}>
              {step.fill ? 'Form' : 'Cue'}
            </span>
            <p className="text-[length:clamp(0.78rem,1.6vh,0.875rem)] leading-snug text-slate-200">
              {step.cue}
            </p>
          </div>
        </div>
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
