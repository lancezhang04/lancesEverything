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
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
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

      {/* Every block below is a fixed height so nothing shifts when the movement
          name wraps to two lines or a step arrives without a cue. */}
      <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
        <div
          className={`flex h-4 items-center gap-2 text-[0.65rem] uppercase tracking-[0.16em] ${theme.text}`}
        >
          <span className={`h-px w-4 ${theme.rule}`} />
          {step.slotLabel}
          <span className={`h-px w-4 ${theme.rule}`} />
        </div>

        {/* Top-aligned, not centred: a one-line movement name has to start at the
            same y as the first line of a two-line one. */}
        <div className="mt-2 flex h-[5.25rem] w-full items-start justify-center">
          <h2 className="max-w-[14ch] text-[clamp(1.5rem,7vw,2rem)] leading-tight text-slate-100">
            {step.name}
          </h2>
        </div>

        <div className="flex h-[2.6rem] w-full items-start justify-center">
          <p
            className={`max-w-[34ch] text-sm leading-snug tabular-nums ${
              step.fill ? theme.text : 'text-slate-400'
            }`}
          >
            {detail}
          </p>
        </div>

        <TickDial fraction={overtime ? 0 : remaining / step.secs} stroke={theme.stroke}>
          <span
            className={`text-[min(19vw,4.5rem)] font-semibold leading-none tabular-nums ${
              overtime ? 'text-rose-400' : armed ? 'text-slate-400' : 'text-slate-100'
            }`}
          >
            {overtime ? '+' : ''}
            {formatClock(remaining)}
          </span>
        </TickDial>

        <div className="mt-4 flex h-[4.75rem] w-full justify-center">
          <div
            className={`flex max-w-[34ch] flex-col justify-center rounded-lg px-4 py-2 ${theme.soft} ${
              step.cue ? '' : 'invisible'
            }`}
          >
            <span className={`mb-0.5 text-[0.6rem] uppercase tracking-[0.14em] ${theme.text}`}>
              {step.fill ? 'Form' : 'Cue'}
            </span>
            <p className="text-sm leading-snug text-slate-200">{step.cue}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
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
            className={`rounded-lg px-4 py-4 text-base font-semibold uppercase tracking-wide transition-colors ${theme.button}`}
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
